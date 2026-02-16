import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Readability } from 'https://esm.sh/@mozilla/readability@0.5.0';
import { parseHTML } from 'https://esm.sh/linkedom@0.16.11';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const TEXT_CAP = 100 * 1024; // 100KB max text per bookmark
const FETCH_TIMEOUT = 10_000; // 10s

const SKIP_SOURCES = ['youtube', 'twitter'];

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Verify JWT — get user from Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Create user-scoped client to verify JWT
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: 'Invalid or expired token' }, 401);
  }

  // Parse request body
  let bookmarkId: string;
  try {
    const body = await req.json();
    bookmarkId = body.bookmark_id;
    if (!bookmarkId) throw new Error('Missing bookmark_id');
  } catch {
    return jsonResponse({ error: 'Invalid request body — expected { bookmark_id }' }, 400);
  }

  // Use service role client for DB operations
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Fetch the bookmark
  const { data: bookmark, error: fetchError } = await adminClient
    .from('bookmarks')
    .select('id, url, source_type, user_id, excerpt')
    .eq('id', bookmarkId)
    .single();

  if (fetchError || !bookmark) {
    return jsonResponse({ error: 'Bookmark not found' }, 404);
  }

  // Verify ownership
  if (bookmark.user_id !== user.id) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  // Skip YouTube/Twitter — no article text to extract
  if (SKIP_SOURCES.includes(bookmark.source_type)) {
    await adminClient
      .from('bookmarks')
      .update({ content_status: 'skipped' })
      .eq('id', bookmarkId);
    return jsonResponse({ status: 'skipped', reason: 'Source type not extractable' }, 200);
  }

  // Set status to extracting
  await adminClient
    .from('bookmarks')
    .update({ content_status: 'extracting' })
    .eq('id', bookmarkId);

  try {
    // Fetch the page HTML
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(bookmark.url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; ContentDeck/1.0; +https://contentdeck.vercel.app)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Parse with linkedom + Readability
    const { document } = parseHTML(html);

    // Readability expects documentURI to be set
    // linkedom doesn't set it automatically
    Object.defineProperty(document, 'documentURI', {
      value: bookmark.url,
      writable: false,
    });

    const reader = new Readability(document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      throw new Error('Readability could not extract content');
    }

    // Cap text at 100KB
    const text =
      article.textContent.length > TEXT_CAP
        ? article.textContent.slice(0, TEXT_CAP)
        : article.textContent;

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(wordCount / 238); // avg reading speed

    const content = {
      text,
      author: article.byline || null,
      word_count: wordCount,
      reading_time: readingTime,
      lead_image: article.content?.match(/<img[^>]+src="([^"]+)"/)?.[1] || null,
      excerpt: article.excerpt || null,
      extracted_at: new Date().toISOString(),
      method: 'readability',
    };

    // Build update — also backfill excerpt if empty
    const update: Record<string, unknown> = {
      content,
      content_status: 'success',
      content_fetched_at: new Date().toISOString(),
    };

    if (!bookmark.excerpt && article.excerpt) {
      update.excerpt = article.excerpt;
    }

    await adminClient.from('bookmarks').update(update).eq('id', bookmarkId);

    return jsonResponse(
      { status: 'success', word_count: wordCount, reading_time: readingTime },
      200,
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';

    await adminClient
      .from('bookmarks')
      .update({
        content: { error: errorMessage, method: 'failed', extracted_at: new Date().toISOString() },
        content_status: 'failed',
        content_fetched_at: new Date().toISOString(),
      })
      .eq('id', bookmarkId);

    return jsonResponse({ status: 'failed', error: errorMessage }, 200);
  }
});

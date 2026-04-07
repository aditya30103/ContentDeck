import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Readability } from 'https://esm.sh/@mozilla/readability@0.5.0';
import { parseHTML } from 'https://esm.sh/linkedom@0.16.11';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
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

// Sources with no webpage text to extract via Readability
// (YouTube now handled separately via caption extraction below)
const SKIP_SOURCES = ['twitter', 'arxiv'];

// ---- YouTube transcript helpers ----

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  return match?.[1] ?? null;
}

async function fetchYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    // Fetch YouTube watch page to get caption track URLs
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    const html = await pageRes.text();

    // Extract caption tracks JSON from ytInitialPlayerResponse
    const match = html.match(/"captionTracks":(\[.*?\])/);
    if (!match) return null;

    const tracks = JSON.parse(match[1]) as Array<{ baseUrl: string; languageCode: string }>;
    if (tracks.length === 0) return null;

    // Prefer English, fall back to first available
    const track =
      tracks.find((t) => t.languageCode === 'en') ??
      tracks.find((t) => t.languageCode?.startsWith('en')) ??
      tracks[0];
    if (!track?.baseUrl) return null;

    // Fetch transcript in JSON3 format
    const captionRes = await fetch(`${track.baseUrl}&fmt=json3`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    const data = (await captionRes.json()) as {
      events?: Array<{ segs?: Array<{ utf8?: string }> }>;
    };

    const text = (data.events ?? [])
      .filter((e) => e.segs)
      .map((e) => e.segs!.map((s) => s.utf8 ?? '').join(''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Return null if transcript is too short to be useful
    if (text.length < 100) return null;
    // Cap at 100KB
    return text.length > TEXT_CAP ? text.slice(0, TEXT_CAP) : text;
  } catch {
    return null;
  }
}

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
    console.error('extract-content: auth failed', { error: authError?.message });
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
    console.error('extract-content: bookmark not found', {
      bookmarkId,
      error: fetchError?.message,
    });
    return jsonResponse({ error: 'Bookmark not found' }, 404);
  }

  // Verify ownership
  if (bookmark.user_id !== user.id) {
    console.error('extract-content: ownership mismatch', { bookmarkId, userId: user.id });
    return jsonResponse({ error: 'Forbidden' }, 403);
  }

  // Skip sources with no extractable text (Twitter)
  if (SKIP_SOURCES.includes(bookmark.source_type)) {
    await adminClient
      .from('bookmarks')
      .update({ content_status: 'skipped' })
      .eq('id', bookmarkId);
    return jsonResponse({ status: 'skipped', reason: 'Source type not extractable' }, 200);
  }

  // ---- YouTube transcript extraction ----
  if (bookmark.source_type === 'youtube') {
    const videoId = extractYouTubeId(bookmark.url);
    if (!videoId) {
      await adminClient
        .from('bookmarks')
        .update({ content_status: 'skipped' })
        .eq('id', bookmarkId);
      return jsonResponse({ status: 'skipped', reason: 'Could not extract video ID' }, 200);
    }

    await adminClient
      .from('bookmarks')
      .update({ content_status: 'extracting' })
      .eq('id', bookmarkId);

    const transcript = await fetchYouTubeTranscript(videoId);
    if (!transcript) {
      await adminClient
        .from('bookmarks')
        .update({ content_status: 'skipped' })
        .eq('id', bookmarkId);
      return jsonResponse({ status: 'skipped', reason: 'No captions available' }, 200);
    }

    const wordCount = transcript.split(/\s+/).filter(Boolean).length;
    await adminClient
      .from('bookmarks')
      .update({
        content: {
          text: transcript,
          method: 'youtube_captions',
          word_count: wordCount,
          extracted_at: new Date().toISOString(),
        },
        content_status: 'success',
        content_fetched_at: new Date().toISOString(),
      })
      .eq('id', bookmarkId);

    return jsonResponse({ status: 'success', word_count: wordCount }, 200);
  }

  // ---- Readability extraction (all other sources) ----

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
    console.error('extract-content: extraction failed', {
      bookmarkId,
      url: bookmark.url,
      error: errorMessage,
    });

    await adminClient
      .from('bookmarks')
      .update({
        content: { error: errorMessage, method: 'failed', extracted_at: new Date().toISOString() },
        content_status: 'failed',
        content_fetched_at: new Date().toISOString(),
      })
      .eq('id', bookmarkId);

    return jsonResponse({ status: 'failed', error: errorMessage }, 500);
  }
});

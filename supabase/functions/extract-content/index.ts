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

const TEXT_CAP = 500 * 1024; // 500KB max text per bookmark (~80k words — covers near-all essays)
const HTML_CAP = 500 * 1024; // 500KB max sanitized HTML per bookmark
const FETCH_TIMEOUT = 10_000; // 10s
const MAX_RETRIES = 2; // on 429/5xx, retry twice with backoff
const RETRY_DELAYS_MS = [1000, 3000]; // 1s, then 3s

// Safari UA — less bot-flagged by CDNs than ContentDeck/1.0 or Chrome-headless patterns.
const FETCH_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15';
const FETCH_HEADERS: HeadersInit = {
  'User-Agent': FETCH_UA,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * Fetch with retry on 429/5xx. Respects Retry-After when present; otherwise
 * uses RETRY_DELAYS_MS. 403 / 404 / other 4xx fall through immediately —
 * retrying won't help and the fallback chain (Phase 2B) handles those.
 */
async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        headers: FETCH_HEADERS,
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });
      if (response.ok) return response;
      if (!RETRYABLE_STATUSES.has(response.status) || attempt === MAX_RETRIES) return response;
      // Respect Retry-After if provided (seconds or HTTP-date; we only parse seconds).
      const retryAfter = response.headers.get('Retry-After');
      const retrySeconds = retryAfter && /^\d+$/.test(retryAfter) ? parseInt(retryAfter, 10) : null;
      const delay = retrySeconds !== null ? Math.min(retrySeconds * 1000, 10_000) : RETRY_DELAYS_MS[attempt];
      console.log('extract-content: retrying after transient status', {
        url,
        status: response.status,
        attempt: attempt + 1,
        delayMs: delay,
      });
      await new Promise((r) => setTimeout(r, delay));
    } catch (err) {
      lastError = err;
      if (attempt === MAX_RETRIES) break;
      const delay = RETRY_DELAYS_MS[attempt];
      console.log('extract-content: retrying after network error', {
        url,
        attempt: attempt + 1,
        delayMs: delay,
        error: err instanceof Error ? err.message : String(err),
      });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError ?? new Error('Unknown fetch error');
}

// Sources with no webpage text to extract via Readability
// (YouTube now handled separately via caption extraction below)
const SKIP_SOURCES = ['twitter', 'arxiv'];

// ---- HTML sanitizer (allow-list, linkedom-based) ----
//
// Readability returns a sanitized-ish HTML string in `article.content`, but
// we do NOT trust it. This allow-list sanitizer walks the DOM and strips
// anything not explicitly allowed. Result is safe to render client-side
// via `dangerouslySetInnerHTML` (the client adds a second DOMPurify pass
// for defence in depth).

const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'strong', 'em', 'b', 'i', 'u', 'sup', 'sub',
  'ul', 'ol', 'li',
  'blockquote',
  'a', 'img',
  'figure', 'figcaption',
  'pre', 'code',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'div', 'span',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  code: new Set(['class']), // preserve language-xxx classes for syntax hinting
  pre: new Set(['class']),
  th: new Set(['colspan', 'rowspan', 'scope']),
  td: new Set(['colspan', 'rowspan']),
};

function isSafeUrl(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return true;
  if (trimmed.startsWith('mailto:')) return true;
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true;
  return false;
}

// deno-lint-ignore no-explicit-any
function sanitizeNode(node: any): void {
  // Walk a snapshot of children (live NodeList mutates as we remove)
  const children = Array.from(node.childNodes ?? []);
  for (const child of children) {
    // deno-lint-ignore no-explicit-any
    const el = child as any;
    if (el.nodeType === 1) {
      // Element
      const tag = String(el.tagName ?? '').toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        // Unwrap: replace element with its sanitized children to preserve text
        sanitizeNode(el);
        const parent = el.parentNode;
        if (parent) {
          while (el.firstChild) parent.insertBefore(el.firstChild, el);
          parent.removeChild(el);
        }
        continue;
      }

      // Strip disallowed attributes
      const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>();
      const attrs = Array.from(el.attributes ?? []) as Array<{ name: string; value: string }>;
      for (const attr of attrs) {
        const name = attr.name.toLowerCase();
        if (!allowed.has(name)) {
          el.removeAttribute(attr.name);
          continue;
        }
        // URL attributes must be http(s), mailto, relative, or fragment
        if ((tag === 'a' && name === 'href') || (tag === 'img' && name === 'src')) {
          if (!isSafeUrl(attr.value)) el.removeAttribute(attr.name);
        }
      }

      // Anchor hardening — force safe target/rel
      if (tag === 'a' && el.hasAttribute?.('href')) {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }

      // Recurse
      sanitizeNode(el);
    } else if (el.nodeType === 8) {
      // Comment → remove
      el.parentNode?.removeChild(el);
    }
    // TextNode (3): keep as-is
  }
}

// deno-lint-ignore no-explicit-any
function sanitizeHtml(rawHtml: string, doc: any): string {
  // Use the same linkedom document to parse into a fragment we can walk
  const container = doc.createElement('div');
  container.innerHTML = rawHtml;
  sanitizeNode(container);
  return String(container.innerHTML ?? '');
}

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
      headers: FETCH_HEADERS,
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
    // Fetch with realistic UA + retry on 429/5xx (Phase 2A)
    const response = await fetchWithRetry(bookmark.url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const rawHtml = await response.text();

    // Parse with linkedom + Readability
    const { document } = parseHTML(rawHtml);

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

    // Cap text at TEXT_CAP; record whether we truncated so the Reader can
    // surface a "Truncated — open original" notice (Phase 2D).
    const textTruncated = article.textContent.length > TEXT_CAP;
    const text = textTruncated ? article.textContent.slice(0, TEXT_CAP) : article.textContent;

    // Sanitize Readability's HTML output and cap at HTML_CAP
    let html: string | null = null;
    let htmlByteSize: number | null = null;
    let htmlTruncated = false;
    if (article.content) {
      const sanitized = sanitizeHtml(article.content, document);
      htmlTruncated = sanitized.length > HTML_CAP;
      html = htmlTruncated ? sanitized.slice(0, HTML_CAP) : sanitized;
      htmlByteSize = html.length;
      if (htmlByteSize > 300 * 1024) {
        console.log('extract-content: large html', { bookmarkId, htmlByteSize });
      }
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(wordCount / 238); // avg reading speed
    const truncated = textTruncated || htmlTruncated;

    const content = {
      text,
      html,
      html_byte_size: htmlByteSize,
      truncated,
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

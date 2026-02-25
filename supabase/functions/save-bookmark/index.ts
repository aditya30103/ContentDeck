import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

async function hashToken(token: string): Promise<string> {
  const encoded = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Extract fields from query params, JSON body, or form-encoded body (in priority order) */
async function extractFields(
  req: Request,
): Promise<{ token: string; url: string; title: string }> {
  const reqUrl = new URL(req.url);

  // 1. Check query parameters first (most reliable for iOS Shortcuts)
  let token = reqUrl.searchParams.get('token') ?? '';
  let url = reqUrl.searchParams.get('url') ?? '';
  let title = reqUrl.searchParams.get('title') ?? '';

  // 2. If query params missing and it's a POST, try parsing the body
  if ((!token || !url) && req.method === 'POST') {
    try {
      const contentType = req.headers.get('content-type') ?? '';
      let body: Record<string, unknown> = {};

      if (contentType.includes('application/json')) {
        body = await req.json();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const text = await req.text();
        const params = new URLSearchParams(text);
        body = Object.fromEntries(params.entries());
      } else {
        // Fallback: try JSON, then form-encoded
        const text = await req.text();
        try {
          body = JSON.parse(text);
        } catch {
          const params = new URLSearchParams(text);
          if (params.get('token') || params.get('url')) {
            body = Object.fromEntries(params.entries());
          }
        }
      }

      // Merge: query params take priority, body fills gaps
      token = token || String(body.token ?? '');
      url = url || String(body.url ?? '');
      title = title || String(body.title ?? '');
    } catch {
      // Body parse failed — use whatever query params we have
    }
  }

  return { token: token.trim(), url: url.trim(), title: title.trim() };
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // Extract fields from query params or body
  const { token, url, title } = await extractFields(req);

  if (!token || !url) {
    return jsonResponse({ error: 'Missing required fields: token, url' }, 400);
  }

  // Validate URL format and scheme (only http/https allowed)
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return jsonResponse({ error: 'Invalid URL scheme — only http and https allowed' }, 400);
    }
  } catch {
    return jsonResponse({ error: 'Invalid URL' }, 400);
  }

  // Hash the token and look it up
  const tokenHash = await hashToken(token);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: tokenRow, error: tokenError } = await adminClient
    .from('user_tokens')
    .select('id, user_id')
    .eq('token_hash', tokenHash)
    .single();

  if (tokenError || !tokenRow) {
    console.error('save-bookmark: token lookup failed', { tokenError: tokenError?.message });
    return jsonResponse({ error: 'Invalid token' }, 401);
  }

  // Insert bookmark with explicit user_id
  // The set_user_id() trigger uses COALESCE(NEW.user_id, auth.uid())
  // so it preserves our explicit user_id instead of overwriting with null
  const { data: bookmark, error: insertError } = await adminClient
    .from('bookmarks')
    .insert({
      user_id: tokenRow.user_id,
      url,
      title: title || null,
      status: 'unread',
      is_favorited: false,
      notes: [],
      tags: [],
      metadata: {},
      synced: false,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('save-bookmark: insert failed', { url, userId: tokenRow.user_id, error: insertError.message });
    return jsonResponse({ error: 'Failed to save bookmark', detail: insertError.message }, 500);
  }

  // Update last_used_at on the token
  await adminClient
    .from('user_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', tokenRow.id);

  return jsonResponse({ id: bookmark.id, status: 'saved' }, 201);
});

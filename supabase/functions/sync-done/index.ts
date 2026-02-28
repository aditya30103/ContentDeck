import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const reqUrl = new URL(req.url);
  const token = (reqUrl.searchParams.get('token') ?? '').trim();

  if (!token) {
    return jsonResponse({ error: 'Missing required field: token' }, 400);
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
    console.error('sync-done: token lookup failed', { tokenError: tokenError?.message });
    return jsonResponse({ error: 'Invalid token' }, 401);
  }

  const userId = tokenRow.user_id as string;

  // ── GET: return done+unsynced bookmarks with areas ──────────────────────────
  if (req.method === 'GET') {
    const { data: rows, error } = await adminClient
      .from('bookmarks')
      .select('*, bookmark_tags(tag_area_id, tag_areas(*))')
      .eq('user_id', userId)
      .eq('status', 'done')
      .eq('synced', false)
      .order('finished_at', { ascending: false });

    if (error) {
      console.error('sync-done: fetch failed', { userId, error: error.message });
      return jsonResponse({ error: 'Failed to fetch bookmarks', detail: error.message }, 500);
    }

    // Flatten areas out of the nested join result
    const bookmarks = (rows ?? []).map((b: Record<string, unknown>) => {
      const tags = b.bookmark_tags as Array<{ tag_areas: unknown }> | null;
      const areas = (tags ?? []).map((bt) => bt.tag_areas).filter(Boolean);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { bookmark_tags: _bt, ...rest } = b;
      return { ...rest, areas };
    });

    return jsonResponse({ bookmarks }, 200);
  }

  // ── POST: mark given IDs as synced ──────────────────────────────────────────
  let ids: string[] = [];
  try {
    const body = (await req.json()) as { ids?: unknown };
    ids = Array.isArray(body.ids) ? (body.ids as string[]) : [];
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (ids.length === 0) {
    return jsonResponse({ marked: 0 }, 200);
  }

  const { error: updateError } = await adminClient
    .from('bookmarks')
    .update({ synced: true })
    .eq('user_id', userId)
    .in('id', ids);

  if (updateError) {
    console.error('sync-done: update failed', { userId, error: updateError.message });
    return jsonResponse({ error: 'Failed to mark bookmarks', detail: updateError.message }, 500);
  }

  return jsonResponse({ marked: ids.length }, 200);
});

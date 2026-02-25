import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

function buildIssueBody(feedback: Record<string, unknown>): string {
  const appCtx = feedback.app_context as Record<string, unknown> | null;
  const sysCtx = feedback.system_context as Record<string, unknown> | null;
  const viewport = sysCtx?.viewport as { width?: number; height?: number } | null;
  const ua = typeof sysCtx?.userAgent === 'string' ? sysCtx.userAgent.slice(0, 120) : '';

  const severityLabel =
    typeof feedback.severity === 'string'
      ? feedback.severity.charAt(0).toUpperCase() + feedback.severity.slice(1)
      : 'Unknown';

  const typeLabel =
    typeof feedback.feedback_type === 'string'
      ? feedback.feedback_type.charAt(0).toUpperCase() + feedback.feedback_type.slice(1)
      : 'Other';

  const lines: string[] = [
    `## Type`,
    `${typeLabel} · Severity: ${severityLabel}`,
    '',
    `## Description`,
    typeof feedback.description === 'string' && feedback.description
      ? feedback.description
      : '_No description provided_',
  ];

  if (appCtx) {
    lines.push('', '## App Context');
    const parts: string[] = [];
    if (appCtx.viewMode) parts.push(`View: ${appCtx.viewMode}`);
    if (appCtx.statusFilter) parts.push(`Filter: ${appCtx.statusFilter}`);
    if (appCtx.activeBookmarkTitle) parts.push(`Active bookmark: "${appCtx.activeBookmarkTitle}"`);
    if (viewport) parts.push(`Viewport: ${viewport.width}×${viewport.height}`);
    if (sysCtx?.online !== undefined) parts.push(`Online: ${sysCtx.online}`);
    lines.push(parts.map((p) => `- ${p}`).join('\n'));
  }

  if (ua) {
    lines.push('', '## System', ua);
  }

  lines.push(
    '',
    '---',
    '*Reported via [ContentDeck in-app feedback](https://contentdeck.vercel.app)*',
  );

  return lines.join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const githubPat = Deno.env.get('GITHUB_PAT');

  if (!githubPat) {
    return jsonResponse({ error: 'GitHub PAT not configured' }, 500);
  }

  // Verify JWT — get user from Authorization header
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
  let feedbackId: string;
  try {
    const body = await req.json();
    feedbackId = body.feedback_id;
    if (!feedbackId) throw new Error('Missing feedback_id');
  } catch {
    return jsonResponse({ error: 'Invalid request body — expected { feedback_id }' }, 400);
  }

  // Fetch feedback row via user-scoped client (RLS ensures ownership)
  const { data: feedback, error: fetchError } = await userClient
    .from('feedback')
    .select('*')
    .eq('id', feedbackId)
    .single();

  if (fetchError || !feedback) {
    return jsonResponse({ error: 'Feedback not found' }, 404);
  }

  // Build GitHub issue
  const issueTitle =
    typeof feedback.title === 'string' && feedback.title
      ? `[Feedback] ${feedback.title}`
      : '[Feedback] New report';

  const issueBody = buildIssueBody(feedback as Record<string, unknown>);

  // POST to GitHub Issues API
  const ghResponse = await fetch(
    'https://api.github.com/repos/aditya30103/ContentDeck/issues',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubPat}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ title: issueTitle, body: issueBody }),
    },
  );

  if (!ghResponse.ok) {
    const errText = await ghResponse.text();
    console.error('GitHub API error:', ghResponse.status, errText);
    return jsonResponse({ error: 'GitHub API error' }, 502);
  }

  const ghIssue = await ghResponse.json() as { number: number; html_url: string };

  // Update feedback row with issue number + URL via admin client
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  await adminClient
    .from('feedback')
    .update({
      github_issue_number: ghIssue.number,
      github_issue_url: ghIssue.html_url,
    })
    .eq('id', feedbackId);

  return jsonResponse(
    { github_issue_number: ghIssue.number, github_issue_url: ghIssue.html_url },
    200,
  );
});

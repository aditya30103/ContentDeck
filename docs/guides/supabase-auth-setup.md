# Supabase Auth Setup Guide

This guide walks you through configuring Supabase Auth for ContentDeck v3.2.

## Prerequisites

- A Supabase project (free tier works)
- The following SQL files applied in Supabase SQL Editor (in order):
  1. `sql/setup.sql` — core schema (bookmarks, tag_areas, user_tokens, triggers)
  2. `sql/feedback.sql` — feedback table
  3. `sql/20260225_github_issue_tracking.sql` — adds `github_issue_number`/`url` to feedback

## 1. Enable Auth Providers

Go to your Supabase Dashboard > Authentication > Providers.

### Magic Link (Email)

Enabled by default. No configuration needed.

Optionally customize the email template at Authentication > Email Templates.

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Navigate to APIs & Services > Credentials
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
6. Copy the Client ID and Client Secret
7. In Supabase Dashboard > Auth > Providers > Google:
   - Toggle ON
   - Paste Client ID and Client Secret
   - Save

### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Set Homepage URL to your app URL (e.g., `https://contentdeck.vercel.app`)
4. Set Authorization callback URL to: `https://<your-project-ref>.supabase.co/auth/v1/callback`
5. Copy the Client ID and Client Secret
6. In Supabase Dashboard > Auth > Providers > GitHub:
   - Toggle ON
   - Paste Client ID and Client Secret
   - Save

## 2. Configure Redirect URLs

In Supabase Dashboard > Authentication > URL Configuration:

- **Site URL**: `https://contentdeck.vercel.app` (your production URL)
- **Redirect URLs**: Add all environments:
  - `https://contentdeck.vercel.app`
  - `http://localhost:5173` (local dev)

## 3. Environment Variables

### Local Development

Create `.env.local` in the project root:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_SENTRY_DSN=                    # optional — paste DSN from sentry.io project settings
```

Find these in Supabase Dashboard > Settings > API.

### Vercel Deployment

In your Vercel project settings > Environment Variables, add:

- `VITE_SUPABASE_URL` = your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon/public key
- `VITE_SENTRY_DSN` = your Sentry DSN (optional — enables production error tracking)

Redeploy after adding the variables.

## 4. Verify

1. Open the app — you should see the AuthScreen with "Try Demo", email input, and OAuth buttons
2. Click "Try Demo" — demo mode should work as before
3. Enter your email and click "Send Magic Link" — check your email for the link
4. Click a magic link — you should be redirected to the dashboard
5. Try Google/GitHub sign in — should redirect and log you in
6. Sign out — should return to AuthScreen

## 5. Edge Function Deployment

ContentDeck has three edge functions. All must be deployed with `--no-verify-jwt` because they handle their own auth (token-based or JWT-manual).

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>

npx supabase functions deploy save-bookmark --no-verify-jwt
npx supabase functions deploy extract-content --no-verify-jwt
npx supabase functions deploy create-github-issue --no-verify-jwt
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available in the edge function environment — no manual configuration needed.

### GitHub Issues sync (optional)

If you want in-app feedback to automatically create GitHub Issues:

```bash
npx supabase secrets set GITHUB_PAT=<your-personal-access-token> --project-ref <your-project-ref>
```

The PAT needs `repo` scope. Without it, `create-github-issue` will return a 502 but feedback is still saved normally.

### Generate an API token (for bookmarklet + iOS Shortcut)

1. Open Settings in the app
2. Under "API Tokens", click "Generate API Token"
3. Copy the token (shown once only)
4. Use the bookmarklet or iOS Shortcut setup instructions shown after generation

## Troubleshooting

### OAuth redirect fails
- Verify the redirect URL in your OAuth provider matches exactly: `https://<ref>.supabase.co/auth/v1/callback`
- Check that your app URL is in the Supabase redirect URLs whitelist

### Magic link not received
- Check spam folder
- Verify email rate limits in Supabase (default: 4 emails/hour per address)
- Check Authentication > Logs in Supabase Dashboard

### "Missing VITE_SUPABASE_URL" error
- Ensure `.env.local` exists with both variables set
- Restart the dev server after adding env vars (Vite doesn't hot-reload env changes)

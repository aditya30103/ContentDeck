# ContentDeck

[![CI](https://github.com/aditya30103/ContentDeck/actions/workflows/ci.yml/badge.svg)](https://github.com/aditya30103/ContentDeck/actions/workflows/ci.yml)

A personal content bookmarking PWA — save articles, videos, tweets, books, and more from any device, read with distraction-free reader mode, reflect with structured notes, and export to Obsidian.

**Live:** [contentdeck.vercel.app](https://contentdeck.vercel.app) | **Version:** v3.2

## Try It

Visit [contentdeck.vercel.app](https://contentdeck.vercel.app) and click **Try Demo** — no account or setup required. Explore with sample data, then sign in with email, Google, or GitHub to save your own bookmarks.

## Features

### Capture
- **Multi-source bookmarking** — YouTube, Twitter/X, LinkedIn, Substack, Blogs, Books, GitHub, arXiv, PDFs
- **Auto source detection** — paste a URL and it's categorized automatically
- **Auto metadata fetching** — titles, thumbnails, reading time via YouTube Data API, Twitter oEmbed, Microlink
- **Book capture without URL** — add books by title + author, no URL required
- **Save from anywhere** — PWA share target, iOS Shortcut, PC bookmarklet, or dashboard

### Organize
- **Status tracking** — cycle bookmarks through `unread → reading → done`
- **Favorites** — star important bookmarks for quick access
- **Tag Areas** — organize bookmarks into visual category cards with emoji + color
- **AI-powered tagging** — OpenRouter auto-classifies new bookmarks and bulk-tags on load
- **Full-text search** — searches title, URL, tags, and extracted article content
- **Filter** — by source type, status, favorites, or tag area
- **Sort** — newest, oldest, or title

### Reflect
- **Detail panel** — click any bookmark to open full details (desktop: right column, mobile: slide-up)
- **Reader mode** — full-screen distraction-free view with extracted article text, typography controls, sepia theme, and progress indicator
- **Content extraction** — article text fetched server-side via Readability; word count + estimated reading time shown automatically
- **Structured notes** — add Insights, Questions, Highlights, or general Notes
- **Note timeline** — color-coded cards with type indicators
- **Reading stats** — completions, streaks, avg completion time, daily activity chart

### Export
- **Obsidian integration** — one-click export with YAML frontmatter + structured notes
- **Obsidian URI** — opens directly in your vault via `obsidian://` protocol
- **Clipboard fallback** — copies markdown when vault name not configured
- **Sync tracking** — marks exported bookmarks so you know what's been processed

## Save from Anywhere

| Platform | Method |
|----------|--------|
| **Android** | Install PWA → share any URL → pick ContentDeck |
| **iPhone/iPad** | Install PWA (Safari → Share → Add to Home Screen) or iOS Shortcut |
| **PC Browser** | Bookmarklet (generate in Settings → API Tokens) |
| **Dashboard** | Manual add with + button |

The PWA Share Target works on Android Chrome and iOS Safari 16.4+. Install ContentDeck to your home screen, then share URLs from any app — ContentDeck appears in the system share sheet and opens with the URL pre-filled.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (dark/light mode)
- **State:** TanStack Query (server) + React Context (UI)
- **Icons:** Lucide React
- **Auth:** Supabase Auth (magic link + Google OAuth + GitHub OAuth)
- **Backend:** [Supabase](https://supabase.com) (PostgreSQL + REST API + RLS + Edge Functions)
- **AI:** [OpenRouter](https://openrouter.ai) (free models: Llama 3.3 70B, Gemma 3, Mistral, Qwen)
- **Content extraction:** Mozilla Readability + linkedom (Deno edge function)
- **Metadata:** YouTube oEmbed + Data API, Twitter oEmbed, [Microlink](https://microlink.io)
- **Error tracking:** [Sentry](https://sentry.io) (browser error capture + source maps)
- **Analytics:** Vercel Analytics + Speed Insights
- **CI/CD:** GitHub Actions + [Vercel](https://vercel.com)

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `sql/setup.sql`
3. Run `sql/feedback.sql` to create the feedback table
4. Enable auth providers (magic link, Google, GitHub) — see `docs/guides/supabase-auth-setup.md`

### 2. Environment Variables

Create `.env.local` in the project root:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_SENTRY_DSN=                    # optional — paste DSN from sentry.io project settings
```

Find Supabase values in Supabase Dashboard → Settings → API.

### 3. Install & Run

```bash
npm install
npm run dev
```

### 4. Deploy

Push to GitHub and connect Vercel for auto-deploy (recommended), or:

```bash
npm run build
npx vercel --prod
```

Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and optionally `VITE_SENTRY_DSN` to Vercel environment variables.

### 5. Deploy Edge Functions

Three edge functions power external save, content extraction, and GitHub issue sync:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>

npx supabase functions deploy save-bookmark --no-verify-jwt
npx supabase functions deploy extract-content --no-verify-jwt
npx supabase functions deploy create-github-issue --no-verify-jwt
```

### 6. Optional Integrations

#### AI Tagging (OpenRouter)
1. Get a free API key at [openrouter.ai](https://openrouter.ai)
2. Settings → AI API Key → paste key
3. New bookmarks get auto-tagged; existing untagged bookmarks are tagged on load

#### Obsidian Export
1. Settings → Obsidian Vault Folder → enter your folder name
2. Click "Export" on any bookmark's detail panel
3. Chrome/Edge: picks folder via File System API. Other browsers: copies markdown to clipboard.

#### GitHub Issues Sync
1. Create a GitHub Personal Access Token with `repo` scope
2. `npx supabase secrets set GITHUB_PAT=<token> --project-ref <your-project-ref>`
3. Redeploy `create-github-issue` — feedback submissions will now auto-create GitHub Issues

### 7. Bookmarklet & iOS Shortcut

Both require an API token generated in Settings → API Tokens.

#### PC Bookmarklet
1. Settings → API Tokens → Generate API Token
2. Drag **+ ContentDeck** to your bookmarks bar
3. Click the bookmarklet on any page to save it

#### iOS Shortcut
The shortcut uses GET with query parameters — this is more reliable than POST + JSON on iOS.

1. Settings → API Tokens → Generate API Token → copy the full shortcut URL shown (it has your token pre-baked)
2. Open **Shortcuts** app → tap **+** → name it "Save to ContentDeck"
3. Tap the shortcut name → **Privacy** → enable **Show in Share Sheet** → select **URLs**
4. Add action: **Text** → paste the copied URL, then append `&url=` and insert the **Shortcut Input** variable at the end
5. Add action: **Get Contents of URL** — leave method as GET, point it at the **Text** result from step 4
6. Share any URL from Safari or any app → pick "Save to ContentDeck"

## Project Structure

```
src/
  components/     React components (layout, feed, detail, modals, areas, settings, auth, ui)
  hooks/          TanStack Query hooks (useBookmarks, useTagAreas, useStats, useAuth, useTokens, useFeedback)
  context/        SupabaseProvider, UIProvider
  lib/            supabase, metadata, ai, obsidian, tokens, utils, mock-supabase, demo-data
  types/          TypeScript interfaces
  pages/          Dashboard (orchestrator)
  App.tsx         Root: auth check, demo mode detection, share target
  main.tsx        Entry point + Sentry init

supabase/
  functions/
    save-bookmark/        Token-authenticated bookmark save (bookmarklet + iOS Shortcut)
    extract-content/      Article text extraction via Readability (reading mode + full-text search)
    create-github-issue/  Creates GitHub Issue from in-app feedback submission

public/
  sw.js           Service worker (network-first navigation, stale-while-revalidate assets, auto-update)
  manifest.json   PWA manifest + share target
  icon.svg        App icon

sql/
  setup.sql       Database schema (bookmarks, tag_areas, user_tokens, status_history, triggers, RPC)
  feedback.sql    Feedback table schema
  migrations/     Incremental schema migrations

vercel.json       SPA rewrites, immutable cache headers for hashed assets
```

## Database Tables

| Table | Purpose |
|-------|---------|
| `bookmarks` | Core data: URL, title, source type, status, notes, tags, metadata (JSONB), content (JSONB) |
| `tag_areas` | User-defined categories with name, emoji, color, sort order |
| `bookmark_tags` | Junction table linking bookmarks to tag areas |
| `status_history` | Audit trail for status changes — powers streaks and reading stats |
| `user_tokens` | API tokens (SHA-256 hashed) for bookmarklet and iOS Shortcut |
| `feedback` | In-app feedback submissions with auto-captured context and GitHub issue link |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `n` | New bookmark |
| `j` / `k` | Navigate list |
| `Esc` | Close panel/modal |

## The Workflow

```
CAPTURE            ORGANIZE           REFLECT             EXPORT
  |                   |                  |                   |
  v                   v                  v                   v
Save URL     ->   Tag + status   ->   Read + notes   ->   One-click to
(shortcut,        (AI auto-tags)      (reader mode,       Obsidian
bookmarklet,                           insights,
share target)                          questions)
```

ContentDeck is your **capture and reflection layer**. Obsidian is your **knowledge layer**. Ideas flow from consumption to permanent notes.

## Quality

- **165 Vitest tests** — unit tests for lib functions, component tests for hooks and UI
- **GitHub Actions CI** — format check, lint, typecheck, tests, and build on every PR
- **Sentry error tracking** — automatic capture of runtime errors and unhandled rejections in production
- **ESLint** with TypeScript strict mode + `jsx-a11y` accessibility rules

## Known Limitations

- OpenRouter free models have rate limits — AI tagging retries with exponential backoff
- Content extraction skips YouTube and Twitter (no article text to extract)
- GitHub Issues sync is one-way — closing an issue on GitHub does not update feedback status in ContentDeck
- SW cache version (`CACHE_NAME` in `sw.js`) requires a manual bump when SW behaviour changes

## Contributing

Issues and PRs welcome at [github.com/aditya30103/ContentDeck](https://github.com/aditya30103/ContentDeck)

## License

MIT

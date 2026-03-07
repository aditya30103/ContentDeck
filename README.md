# ContentDeck

[![CI](https://github.com/aditya30103/ContentDeck/actions/workflows/ci.yml/badge.svg)](https://github.com/aditya30103/ContentDeck/actions/workflows/ci.yml)
[![React Doctor](https://img.shields.io/badge/react--doctor-92%2F100-brightgreen)](https://www.react.doctor/share?p=contentdeck&s=92&w=52&f=27)

A personal content bookmarking PWA built around the **Trusted Curator** paradigm — save from anywhere, get a single confident recommendation for what to read next, reflect with structured notes, review on a spaced schedule, and export to Obsidian.

**Live:** [contentdeck.vercel.app](https://contentdeck.vercel.app) | **Version:** v3.6

---

## Try It

Visit [contentdeck.vercel.app](https://contentdeck.vercel.app) and click **Try Demo** — no account or setup required. Explore with sample data, then sign in with email, Google, or GitHub to save your own bookmarks.

---

## Features

### Capture
- **Multi-source bookmarking** — YouTube, Twitter/X, LinkedIn, Substack, Blogs, Books, arXiv, GitHub, PDFs
- **Auto source detection** — paste a URL and it's categorized automatically
- **Auto metadata fetching** — titles, thumbnails, reading time via YouTube Data API, Twitter oEmbed, Microlink
- **Book capture without URL** — add books by title + author, no URL required
- **Save from anywhere** — PWA share target (Android/iOS), iOS Shortcut, PC bookmarklet, or dashboard

### Curate
- **Trusted Curator home screen** — one confident recommendation for what to read next, not a list to scroll
- **Scoring engine** — pure client-side 7-factor algorithm: staleness, source diversity, effort fit, completion rate, freshness, favorites, and recency penalty
- **Mood selector** — five modes (Smart, Deep, Light, Quick, Shuffle) shift weight vectors to match your session energy
- **Reason strings** — every recommendation comes with a plain-English explanation of why it was chosen
- **Values onboarding** — set priority areas and preferred session length; the engine weights picks accordingly
- **Secondary picks** — "Continue" (in-progress) and "Quick Win" (shortest unread) surface alongside the primary pick
- **Just Added strip** — recently saved bookmarks shown inline on the home screen for immediate action

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
- **Reflection prompt** — on marking done, a guided modal prompts for a closing reflection (voice-enabled via Web Speech API)
- **Note timeline** — color-coded cards with type indicators
- **Reading stats** — completions, streaks, avg completion time, daily activity chart

### Review
- **Spaced review** — SM-2 algorithm schedules bookmarks for periodic re-reading based on your recall rating
- **Review modal** — rate each review (Again / Hard / Good / Easy); next review date computed automatically
- **Due count badge** — home screen shows how many bookmarks are due for review today

### Export
- **Obsidian export** — one-click export with YAML frontmatter, areas as wikilinks, structured notes, and reflection section
- **Auto-export on mark-done** — optionally export to Obsidian automatically when a bookmark is marked done
- **Obsidian Community Plugin** — install via BRAT; syncs done bookmarks directly into your vault with a ribbon icon and command palette action
- **Clipboard fallback** — copies markdown when vault isn't configured or browser doesn't support File System API
- **Sync tracking** — marks exported bookmarks so the plugin knows what's been processed

---

## Save from Anywhere

| Platform | Method |
|----------|--------|
| **Android** | Install PWA → share any URL → pick ContentDeck |
| **iPhone/iPad** | Install PWA (Safari → Share → Add to Home Screen) or iOS Shortcut |
| **PC Browser** | Bookmarklet (generate in Settings → API Tokens) |
| **Dashboard** | Manual add with the + button |

The PWA Share Target works on Android Chrome and iOS Safari 16.4+. Install ContentDeck to your home screen, then share URLs from any app — ContentDeck appears in the system share sheet with the URL pre-filled.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v4 (dark / light / sepia / navy themes) |
| State | TanStack Query (server) + React Context (UI) |
| Routing | react-router-dom v7 (`/` home, `/library` library) |
| Icons | Lucide React |
| Auth | Supabase Auth — magic link + Google OAuth + GitHub OAuth |
| Backend | Supabase (PostgreSQL + REST API + Row Level Security + Edge Functions) |
| AI | OpenRouter — free models: Llama 3.3 70B, Gemma 3, Mistral, Qwen |
| Content extraction | Mozilla Readability + linkedom (Deno edge function) |
| Metadata | YouTube oEmbed + Data API v3, Twitter oEmbed, Microlink |
| Error tracking | Sentry — browser capture + source maps |
| Analytics | Vercel Analytics + Speed Insights |
| CI/CD | GitHub Actions + Vercel (auto-deploy from `main`) |

---

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run each file in `sql/` in this order:
   - `setup.sql` — base schema (bookmarks, tag_areas, user_tokens, status_history, triggers)
   - `feedback.sql` — feedback table
   - `20260225_github_issue_tracking.sql` — GitHub issue columns
   - `20260226_arxiv_source_type.sql` — arXiv source type
   - `20260307_spaced_review.sql` — spaced review column
3. Enable auth providers — see [`docs/guides/supabase-auth-setup.md`](docs/guides/supabase-auth-setup.md)

### 2. Environment Variables

Create `.env.local` in the project root:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_SENTRY_DSN=        # optional — paste DSN from sentry.io project settings
```

Find Supabase values in **Dashboard → Settings → API**.

### 3. Install & Run

```bash
npm install
npm run dev
```

### 4. Deploy

Connect your GitHub repo to Vercel for auto-deploy (recommended), or deploy manually:

```bash
npm run build
npx vercel --prod
```

Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and optionally `VITE_SENTRY_DSN` to Vercel environment variables.

### 5. Deploy Edge Functions

Four edge functions power external save, content extraction, GitHub issue sync, and Obsidian plugin sync:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>

npx supabase functions deploy save-bookmark --no-verify-jwt
npx supabase functions deploy extract-content --no-verify-jwt
npx supabase functions deploy create-github-issue --no-verify-jwt
npx supabase functions deploy sync-done --no-verify-jwt
```

### 6. Optional Integrations

#### AI Tagging (OpenRouter)
1. Get a free API key at [openrouter.ai](https://openrouter.ai)
2. Settings → AI API Key → paste key
3. New bookmarks are auto-tagged; existing untagged bookmarks are tagged on load

#### Obsidian Export
1. Settings → Obsidian → enter your vault name and folder
2. Click **Export** on any bookmark's detail panel — opens directly in your vault via `obsidian://`
3. Browsers without File System API support (Firefox, Safari) copy markdown to clipboard

#### Obsidian Community Plugin
1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) in Obsidian
2. BRAT → Add Beta Plugin → `aditya30103/obsidian-contentdeck`
3. Enable the plugin → Settings → paste your ContentDeck API token and Supabase URL
4. Use the ribbon icon or command palette to sync done bookmarks into your vault

#### GitHub Issues Sync (for self-hosters)
1. Create a GitHub Personal Access Token with `repo` scope
2. `npx supabase secrets set GITHUB_PAT=<token> --project-ref <your-project-ref>`
3. Redeploy `create-github-issue` — feedback submissions will auto-create GitHub Issues

### 7. Bookmarklet & iOS Shortcut

Both require an API token generated in **Settings → API Tokens**.

#### PC Bookmarklet
1. Settings → API Tokens → Generate Token
2. Drag **+ ContentDeck** to your bookmarks bar
3. Click the bookmarklet on any page to save it — deduplication prevents double-saves

#### iOS Shortcut
1. Settings → API Tokens → Generate Token → copy the full shortcut URL shown
2. Shortcuts app → **+** → name it "Save to ContentDeck" → enable **Show in Share Sheet** for URLs
3. Add action: **Text** → paste the copied URL, append `&url=`, then insert **Shortcut Input** at the end
4. Add action: **Get Contents of URL** → GET, pointed at the Text from step 3
5. Share any URL → pick "Save to ContentDeck"

---

## Project Structure

```
src/
├── components/     React components (layout, feed, detail, modals, areas, settings, auth, ui)
├── hooks/          TanStack Query hooks — useBookmarks, useTagAreas, useStats, useAuth,
│                   useTokens, useFeedback, useScoring, useUserValues, useSpacedReview
├── context/        SupabaseProvider, UIProvider
├── lib/            supabase, metadata, ai, obsidian, tokens, utils, scoring,
│                   spaced-review, mock-supabase, demo-data
├── types/          TypeScript interfaces — Bookmark, TagArea, UserToken, Note, scoring
├── pages/          HomePage (curator home), Dashboard (library orchestrator)
├── App.tsx         Root: auth check, demo mode, share target, routing
└── main.tsx        Entry point + Sentry init

supabase/functions/
├── save-bookmark/        Token-auth bookmark save (bookmarklet + iOS Shortcut)
├── extract-content/      Article extraction via Readability (reader mode + full-text search)
├── create-github-issue/  Creates GitHub Issue from in-app feedback submission
└── sync-done/            Obsidian plugin sync — GET done bookmarks, POST mark synced

public/
├── sw.js           Service worker (network-first navigation, stale-while-revalidate assets)
├── manifest.json   PWA manifest + share target definition
└── icon.svg        App icon

sql/
├── setup.sql                       Base schema + triggers + RLS policies
├── feedback.sql                    Feedback table
├── 20260225_github_issue_tracking.sql
├── 20260226_arxiv_source_type.sql
└── 20260307_spaced_review.sql      last_reviewed_at column + SM-2 fields

vercel.json         SPA rewrites + immutable cache headers for hashed assets
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `bookmarks` | URL, title, source type, status, notes (JSONB), metadata (JSONB), extracted content (JSONB), spaced review fields |
| `tag_areas` | User-defined categories — name, emoji, color, sort order |
| `bookmark_tags` | Junction table linking bookmarks to tag areas |
| `status_history` | Audit trail for status changes — powers streaks and reading stats |
| `user_tokens` | API tokens (SHA-256 hashed) for bookmarklet and iOS Shortcut auth |
| `feedback` | In-app feedback with auto-captured context and GitHub issue link |

All tables use **Row Level Security** — users can only access their own data.

---

## The Workflow

```
CAPTURE         CURATE              REFLECT            REVIEW           EXPORT
  │               │                   │                  │                │
  ▼               ▼                   ▼                  ▼                ▼
Save URL  →  System picks  →  Read + notes  →  Spaced review  →  Export to
(shortcut,   what to read      (reader mode,    (SM-2 recall       Obsidian
bookmarklet, next (scoring     insights,         rating)           (auto or
share target) engine + mood)   reflection)                         manual)
```

ContentDeck is your **capture, curation, and reflection layer**. Obsidian is your **knowledge layer**. Ideas flow from web browsing to structured permanent notes.

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `n` | New bookmark |
| `j` / `k` | Navigate list |
| `Esc` | Close panel / modal |

---

## Quality

- **261 Vitest tests** — unit tests for lib functions (27 scoring engine, 19 spaced review, 20 metadata) + component tests for hooks and UI
- **GitHub Actions CI** — format check, lint, typecheck, tests, and build on every PR and push to `main`
- **Sentry error tracking** — all 14 mutations, ErrorBoundary, and global `unhandledrejection` captured in production
- **ESLint** with TypeScript strict mode + `jsx-a11y` — accessibility issues caught at lint time
- **Accessibility** — ARIA roles, focus management, 44px touch targets, `motion-reduce:` variants throughout

---

## Known Limitations

- OpenRouter free models have rate limits — AI tagging may silently skip on burst saves
- Content extraction skips Twitter, books, and arXiv (no article body to extract); YouTube extracts the video transcript via caption scraping — videos without captions show "No transcript available"
- GitHub Issues sync is one-way — closing an issue on GitHub does not update feedback status in ContentDeck
- Demo mode stays on `/library` — the curator home screen requires real user data and values onboarding

---

## Contributing

Issues and PRs welcome at [github.com/aditya30103/ContentDeck](https://github.com/aditya30103/ContentDeck)

## License

MIT

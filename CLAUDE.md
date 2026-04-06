# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ContentDeck — a personal content bookmarking PWA dashboard for the Capture → Consume → Reflect → Export workflow. Bridges web browsing and Obsidian knowledge management.

**Status: v3.9.2 — Phase 2 COMPLETE. Maintenance mode. React + Vite + Tailwind + TypeScript + framer-motion. Supabase Auth, demo mode, PWA share target, Sentry, GitHub Issues sync, Obsidian export + Community Plugin, Spaced Review (SM-2). v3.8 mobile UX overhaul (native app feel). v3.9 gesture layer (bottom sheet drag, modal slide-up/drag-dismiss, reader swipe). v3.9.2 test suite hardening (271 → 470 tests, 28 files).**

See `docs/reference/audit.md` for the full audit trail (39/47 v1 issues resolved, 14 v2.0 bugs fixed, 8 v2.2 shipping fixes).

## Documentation

All project docs live in `docs/`. Start each session by reading `docs/INDEX.md`.

| Directory | Purpose |
|-----------|---------|
| `docs/plan/` | Feature roadmap chunked by phase |
| `docs/log/` | Implementation records for shipped features |
| `docs/guides/` | Development workflow and setup guides |
| `docs/reference/` | Audit trail, integrations, lookup tables, **design system** |

**Current phase:** Phase 2 (Trusted Curator) — see `docs/plan/phase-2.md`. 2.0 Obsidian Plugin ✅ · 2.1 Values Onboarding ✅ · 2.2 Scoring Engine ✅ · 2.3 Home Screen ✅ · 2.4 Reflection Prompt ✅ · 2.5 Spaced Review ✅ · **Phase 2 COMPLETE. Maintenance mode — no new features planned. Next: Phase 3 or v4.0 Intelligence Layer (deferred).**

## Tech Stack

- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 (dark/light mode via `class` strategy)
- **State:** TanStack Query (server state) + React Context (UI state)
- **Icons:** Lucide React
- **Auth:** Supabase Auth (magic link + Google OAuth + GitHub OAuth)
- **Backend:** Supabase (PostgreSQL + REST API + RLS per user + Edge Functions)
- **AI:** OpenRouter (client-side, user-provided API key, free models)
- **Error tracking:** Sentry (`@sentry/react` — all mutations, ErrorBoundary, unhandledrejection)
- **Analytics:** Vercel Analytics + Speed Insights
- **Hosting:** Vercel (auto-deploy from `main` branch, `vercel.json` for SPA rewrites + cache headers)

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build to dist/
npm run preview      # Preview production build locally
npm run lint         # ESLint check on src/
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier auto-format
npm run format:check # Prettier check (CI-friendly)
npm run typecheck    # TypeScript type check (no emit)
npm run test         # Run Vitest regression tests
npm run test:watch   # Run tests in watch mode
```

## Architecture

```
src/
├── components/      # React components (layout, feed, detail, modals, areas, auth, settings, ui)
├── hooks/           # TanStack Query hooks (useBookmarks, useTagAreas, useStats, useAuth, useTokens, etc.)
├── context/         # SupabaseProvider, UIProvider
├── lib/             # supabase.ts, metadata.ts, ai.ts, obsidian.ts, tokens.ts, utils.ts, mock-supabase.ts, demo-data.ts
├── types/           # TypeScript interfaces (Bookmark, TagArea, UserToken, Note, etc.)
├── pages/           # Dashboard.tsx (orchestrator)
├── App.tsx          # Root: auth check, demo mode detection, share target
└── main.tsx         # Entry point

supabase/
└── functions/
    ├── save-bookmark/        # Token-authenticated bookmark save (bookmarklet + iOS Shortcut)
    ├── extract-content/      # Article extraction via Readability (reader mode + full-text search)
    ├── create-github-issue/  # Feedback → GitHub Issue sync (GITHUB_PAT secret)
    └── sync-done/            # Obsidian plugin sync — GET done+unsynced bookmarks, POST mark synced (token auth)
```

### Key patterns

- **Supabase Auth:** `useAuth` hook manages session via `supabase.auth`. OAuth callback detected automatically via `onAuthStateChange`. No separate callback page.
- **Supabase client:** Singleton created from env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). SupabaseProvider passes it via context; mock client used for demo mode.
- **All data mutations** use TanStack Query with optimistic updates + automatic rollback on error
- **Source type colors** defined once in `src/index.css` as `--color-source-*` CSS variables (not duplicated in components). There is no `tailwind.config.ts` — Tailwind v4 uses CSS-first configuration via `@theme` in `index.css`.
- **Reusable `Modal` component** has focus trapping, ARIA attributes, ESC handling built in
- **Accessibility first:** `focus-visible:ring-2` on all interactives, proper `<label>` elements, `motion-safe:`/`motion-reduce:` variants. `eslint-plugin-jsx-a11y` enforces a11y rules at lint time.
- **Clickable cards:** use `<div role="button">` not `<article role="button">` — non-interactive elements cannot take interactive roles per ARIA spec
- **Modal structure:** `role="dialog"` goes on the inner content panel, not the backdrop `<div>`; backdrop is a plain div with no role
- **Demo mode:** `localStorage.getItem('contentdeck_demo') === 'true'` → mock Supabase client operates on in-memory arrays, zero hook changes needed
- **PWA Share Target:** `manifest.json` `share_target` + `?url=` query param handling in App.tsx → AddBookmarkModal pre-fill
- **Service worker:** Network-first for navigation, stale-while-revalidate for assets. Navigation requests use a 4s AbortController timeout to prevent Safari iOS hangs on cold starts. `CACHE_NAME` is auto-injected at build time — `swVersionPlugin` in `vite.config.ts` replaces the `__SW_BUILD__` placeholder in `public/sw.js` with `Date.now()`, so every deploy gets a unique cache name. Never bump manually.
- **Loading state:** Inline CSS spinner in `index.html` shown until React mounts (no blank page)
- **Edge Functions:** All deployed with `--no-verify-jwt`; verify auth in function code. `save-bookmark` accepts `{ token, url, title? }` via query params or JSON body, validates SHA-256 token hash. `extract-content` uses JWT + ownership check, runs Readability, stores in `content` JSONB. `create-github-issue` uses JWT + ownership check, POSTs to GitHub API, writes back `github_issue_number`/`url`.
- **Sentry:** `enabled: !!VITE_SENTRY_DSN` — completely inert when DSN absent. Edge functions use `console.error` with context (no Sentry SDK in Deno runtime).
- **Route split (Phase 2.3):** `/` → HomePage (curator-first; requires real data; no demo mode), `/library` → Dashboard (existing library; demo mode stays here)
- **Theme pattern:** Container/panel backgrounds → `bg-surface-50 dark:bg-surface-900`. Form inputs keep `bg-white dark:bg-surface-800`. Navy co-applies `.dark` class via `applyTheme()` so all `dark:` variants activate. All close/icon buttons need explicit `text-surface-500 dark:text-surface-400` — icons have no default dark-mode color.
- **4-theme verification:** Any UI change touching bg/border/text must be checked in all 4 themes (Light, Dark, Sepia, Navy) before shipping.
- **Design system:** Full token reference, component catalog, spacing conventions, and accessibility patterns live in `docs/reference/design-system.md`. Read it before any UI work.

## Database (Supabase PostgreSQL)

Schema in `sql/setup.sql` + `sql/feedback.sql` + `sql/20260225_github_issue_tracking.sql`. Key tables:
- `bookmarks` — user_id, url, title, source_type, status (unread/reading/done), is_favorited, notes (JSONB array), metadata (JSONB), content (JSONB — extracted text/word_count/reading_time), synced, last_reviewed_at (timestamptz, nullable)
- `tag_areas` — user_id, name, emoji, color, sort_order
- `bookmark_tags` — junction table (scoped via bookmark's user_id)
- `status_history` — user_id, audit trail for streak/stats calculations
- `user_tokens` — user_id, name, token_hash (SHA-256), last_used_at (for bookmarklet/iOS Shortcut auth)
- `feedback` — user_id, title, type, severity, context (JSONB), status, github_issue_number, github_issue_url

DB triggers:
- `detect_source_type()` — auto-classifies URLs using `~*` (case-insensitive regex)
- `track_status_change()` — logs status transitions, sets `started_reading_at`/`finished_at`
- `set_user_id()` — auto-sets `user_id` to `auth.uid()` on insert (bookmarks, tag_areas, status_history)

RLS policies:
- All tables have row-level security enabled
- Users can only read/write their own data (`auth.uid() = user_id`)
- `bookmark_tags` scoped via subquery on `bookmarks.user_id`

## Important rules

- **PostgreSQL regex:** Always use `~*` (case-insensitive), never `~`
- **YouTube URL detection** must handle `youtube.com`, `youtu.be`, AND `youtube.app.goo.gl`
- **Twitter URL detection** must handle `twitter.com`, `x.com`, AND `t.co`
- **LinkedIn URL detection** must handle `linkedin.com` AND `lnkd.in`
- **No secrets in code.** Supabase URL and anon key in env vars. OpenRouter/YouTube API keys entered at runtime, stored in localStorage.
- **Tab counts** should reflect current status filter
- **Dates:** Always use local timezone (`toLocaleDateString()`), never `toISOString().slice()` for display
- **Touch targets:** Minimum 44x44px on all interactive elements
- **Demo mode** is detected by `localStorage.getItem('contentdeck_demo') === 'true'` — metadata fetch and AI tagging are skipped
- **No Knowledge Graph** — dropped in v2 (Obsidian handles this)

## External APIs (all free tier)

- **Supabase Auth** — magic link, Google OAuth, GitHub OAuth
- **Supabase REST API** — all CRUD (RLS-protected, user-scoped)
- **Supabase Edge Functions** — `save-bookmark` (token auth), `extract-content` (JWT auth), `create-github-issue` (JWT auth + GITHUB_PAT secret)
- **OpenRouter** — AI tagging (free models: Llama 3.3 70B, Gemma 3, Mistral, Qwen)
- **YouTube oEmbed** — video titles (no key needed)
- **YouTube Data API v3** — video duration/channel (free 10K units/day)
- **Twitter oEmbed** — tweet titles (no key needed)
- **Microlink API** — generic title fetching (50 req/day free tier)
- **GitHub API** — issue creation from in-app feedback (`GITHUB_PAT` Supabase secret)
- **Sentry** — runtime error capture, source maps (free 5K events/month; `VITE_SENTRY_DSN` env var)

## Error Handling

- **Sentry**: `captureException` in all 14 mutation `onError` callbacks, `ErrorBoundary.componentDidCatch`, global `unhandledrejection` listener, and fire-and-forget `.catch()` chains. No-op when `VITE_SENTRY_DSN` is absent.
- **Error Boundary**: Wraps the entire app — catches render errors, shows reload button, reports to Sentry
- **TanStack Query**: All mutations have optimistic update + automatic rollback on error + toast notification
- **Notes mutations**: `addNote`/`deleteNote` fetch current state from DB (not cache) to prevent race conditions
- **AI/Metadata**: Fire-and-forget with silent failure — non-critical features. Metadata fetch completes before AI tagging so the LLM has title + excerpt context.

## Development Workflow

### Branching Strategy

- **`main`** = production (auto-deploys to Vercel)
- **Feature branches** include the GitHub Issue number: `feat/4-full-text-search`, `fix/7-mobile-stats`
- **Pull requests** to merge back to `main` — body must include `Closes #N` to auto-close the issue

### Conventional Commits

All commits use conventional commit format:

- `feat: <description>` — new feature
- `fix: <description>` — bug fix
- `refactor: <description>` — code restructuring (no behavior change)
- `chore: <description>` — tooling, deps, config
- `docs: <description>` — documentation only
- `test: <description>` — tests only

### Quality Checks

Run in this order before every commit — all must pass:

1. `npm run format:check` — Prettier formatting
2. `npm run lint` — ESLint (zero errors required, warnings acceptable)
3. `npm run typecheck` — TypeScript strict mode
4. `npm run test` — Vitest regression tests (all must pass)
5. `npm run build` — Vite production build

**CI:** GitHub Actions runs this same pipeline on every PR and push to `main` (`.github/workflows/ci.yml`).

### Claude Code Skills

| Skill | Description |
|-------|-------------|
| `/feature` | Full branch-to-PR workflow: plan → implement → verify → ship |
| `/ship` | End-of-session: quality pipeline, docs/log update, commit, push |
| `/audit` | 10-category codebase quality audit (async, cache, demo parity, mobile) |
| `/sync-docs` | Documentation reconciler — finds and fixes drift across all docs, skills, memory, and code |
| `/test` | Write Vitest unit or component tests following codebase patterns |
| `/ui` | Systematic UI work — component states, mobile parity, accessibility |
| `/perf-check` | Bundle size, deployment config, TTFB investigation |
| `/supabase-migrate` | Generate SQL migration files following schema conventions |
| `/obsidian-plugin` | Obsidian plugin lifecycle — debug, add features, release, keep in sync with ContentDeck |

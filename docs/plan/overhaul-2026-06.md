# Professional Release Overhaul — June 2026

> Goal: take ContentDeck from "personal tool with rough edges" to a professional-grade web app,
> usable by the public on desktop and mobile. Full review across all fronts: UI/UX, code quality,
> security, performance, intelligence. End state: confident public release.

**Started:** 2026-06-10
**Baseline:** v3.11.0, main clean, 481 tests passing
**Driver doc for the week — update status markers as work lands.**

---

## Why previous polish attempts fell short (root-cause honesty)

1. **No systematic browser-level QA.** Fixes were verified by unit tests + ad-hoc manual checks.
   Unit tests can't catch "Google button unreachable on short viewport" — a whole class of
   layout/scroll/viewport bugs ships invisibly. The fix class for this week: headless-browser QA
   sweeps (gstack `/qa`, `/browse`) across desktop + mobile viewports + all 4 themes, with
   screenshots as evidence, before anything is called done.
2. **Global invariants changed without screen-by-screen re-verification.** Example: v3.8 locked
   `html/body` to `overflow: hidden` for native-app feel — every screen then needed its own scroll
   container, but AuthScreen was missed (found + fixed 2026-06-10). When a global rule changes,
   every screen must be re-audited against it.
3. **"Personal tool" assumptions baked in.** Client-side BYO API keys, single-user demo logic,
   no rate limiting, no legal pages — fine for one user, not for public release.

---

## Workstreams

### WS0 — Baseline & Triage (Day 1) ⏳
- [x] Fix AuthScreen scroll lockout (sign-in unreachable) — found during kickoff
- [ ] Full quality pipeline green: format → lint → typecheck → test → build
- [ ] **Live QA sweep** (`/qa-only` report mode): production app at contentdeck.vercel.app,
      desktop (1440/1024) + mobile (390/360) viewports, all 4 themes, both routes (`/`, `/library`),
      logged-out + demo + logged-in flows. Output: scored bug list with screenshots.
- [ ] **Screen-by-screen scroll/viewport audit**: every route + every full-screen modal must own
      its scrolling (AuthScreen bug class). Check: HomePage, Dashboard, ReaderModal, SettingsModal,
      ValuesOnboardingModal, ReviewModal, ReflectionModal, DetailPanel, Stats.
- [ ] `/audit` skill: async races, cache consistency, demo parity, mobile parity
- [ ] `/cso` security audit: RLS, edge function auth, reader-HTML XSS surface (DOMPurify config),
      token handling, secrets, dependency supply chain
- [ ] Consolidate everything into a single prioritized P0/P1/P2 findings list (append below)

### WS1 — UI/UX Stabilization (Days 2–3)
- [ ] Fix all P0/P1 UI findings from WS0, **each verified in-browser before close**
- [ ] 4-theme verification pass on every screen (Light/Dark/Sepia/Navy)
- [ ] Mobile + desktop parity check (the two have diverged repeatedly)
- [ ] Design overhaul Phase 3 (Delight) + Phase 4 (Signature) — `docs/design/INDEX.md` roadmap
- [ ] Empty states, loading states, error states for every data surface

### WS2 — Code Quality & Security Hardening (Days 3–4)
- [ ] Fix all P0/P1 code findings from `/audit` + `/cso`
- [ ] Edge function hardening for public traffic: rate limiting, input validation, abuse resistance
      (`save-bookmark` token endpoint is internet-facing)
- [ ] Dependency audit + updates
- [ ] Sentry noise review — what's actually firing in production
- [ ] Performance: `/perf-check` + Core Web Vitals on live site; bundle re-check

### WS3 — Public Release Readiness (Days 4–5)
- [x] **Decision (Aditya, 2026-06-10):** BYO-keys is the permanent principle — no owner-credit
      proxying. Provider abstraction: OpenRouter + OpenAI (both BYO key) + Ollama local backup
      (pending feasibility spike — HTTPS→localhost CORS/PNA constraints).
- [ ] Stranger-proof onboarding: first-run experience for someone who isn't Aditya
- [ ] Supabase free-tier headroom review (rows, edge function invocations, auth MAU)
- [ ] Privacy policy + terms pages (data stored, Sentry, analytics disclosure)
- [ ] Landing/marketing polish: OG images, README, screenshots, app store-quality PWA install flow
- [ ] Demo mode as the public front door — make it flawless

### WS4 — Intelligence + Reader Completion (Days 5–6)
- [ ] Provider abstraction in `src/lib/ai.ts`: OpenRouter + OpenAI, both BYO key
- [ ] Ollama feasibility spike (timeboxed ~1h): HTTPS app → `http://localhost:11434`
      (mixed content / Private Network Access / Ollama CORS). Implement only if clean.
- [ ] Upgrade tagging/summarization quality with the better models
- [ ] **Reader Mode 2B** (folded in from reader-mode-overhaul.md): Postlight + Microlink
      extraction fallback chain — raises extraction success rate for public users.
      2C PDF + Phase 3 stay deferred to post-release.

### WS-meta — Workspace Cleanup (after WS0, interleaved Days 2–4)
- [ ] Audit all project-local skills (`.claude/skills/`: audit, feature, ship, test, ui,
      sync-docs, perf-check, supabase-migrate, obsidian-plugin) — fix errors, short-sightedness,
      drift; delete or rewrite as needed. **Read + verify every skill before first use this week.**
- [ ] Reconcile CLAUDE.md / docs/INDEX.md / MEMORY.md / package.json version drift
      (e.g. package.json 3.10.0 vs shipped v3.11.0)
- [ ] Prune stale plans/logs; tighten docs structure for a public repo
- [ ] Bake the browser-QA loop into the workflow docs + skills so it's permanent

### WS5 — Final Gate (Day 7)
- [ ] Full `/qa` exhaustive sweep on production candidate
- [ ] Real-device testing (iPhone + Android) — final gate per project rule
- [ ] `/document-release` — docs/CHANGELOG/version sync
- [ ] Tag release, announce

---

## Consolidated Findings (populated by WS0)

Full QA evidence: `.gstack/qa-reports/qa-report-contentdeck-vercel-app-2026-06-10.md` (health 80/100, zero console errors)

| # | Pri | Area | Finding | Status |
|---|-----|------|---------|--------|
| 1 | P0 | UI | AuthScreen relies on document scroll, which v3.8 disabled globally — on iPhone-size viewports the ENTIRE sign-in section is invisible; sign-in impossible on mobile | ✅ Fixed + verified in-browser (v3.11.1) |
| 2 | P0 | UI | Demo banner overlays sticky app chrome instead of reserving space — mobile demo users lose search/add/settings/stats entirely; desktop loses source tabs; HomePage header clipped. UpdateBanner had same bug | ✅ Fixed + verified — app-level flex column, banners static, screens `h-full` (v3.11.1) |
| 3 | P1 | Demo parity | Reader Mode unreachable in demo — six demo bookmarks shipped `content_status: 'pending'` which never resolves (extraction never runs in demo) → perpetual disabled "Extracting…" | ✅ Fixed + verified — AHA/Stratechery get full sample articles ('success'), substack/blog → 'partial' w/ excerpt, LinkedIn → 'skipped' (v3.11.1) |
| 4 | P1 | Theme/a11y | Sepia washed out app-wide. TRUE root cause: Tailwind v4's `sepia` FILTER utility collides with the `.sepia` theme class on `<html>` → `filter: sepia(1)` over the whole app since the theme shipped. Secondary: sepia surface-400/500 text tokens were ~2.5:1 on cream | ✅ Fixed + verified — `filter: none` on `html.sepia` + darkened 400–700 ramp to ≥4.5:1 (v3.11.1) |
| 5 | P2 | UI | Mood pill row clipped at 390px ("Shuffle" cut off) — row IS `overflow-x-auto` (swipeable); cosmetic affordance only, downgraded | ⬜ (cosmetic) |
| 6 | P2 | Docs | Demo mode serves HomePage at `/`; docs say demo stays on `/library` only — doc drift or route-guard regression | ⬜ (WS-meta) |
| 7 | P2 | Meta | package.json 3.10.0 vs shipped v3.11.0 | ⬜ (WS-meta) |
| 8 | P2 | Tests | framer-motion `ref` warning in Modal tests; 6 ESLint warnings (unused disables, fast-refresh, useMemo dep) | ⬜ |
| 9 | P0 | UI | Bottom nav floats above a ~59pt dead band on device (user-reported, multiple past fix attempts failed). The zone is outside the layout viewport — unclaimable by CSS layout. PR #60 (static footer + safe-area pad) made it WORSE on device: `env(safe-area-inset-bottom)` double-counts there. Padding reverted (PR #61); temp viewport diagnostics added to Settings; awaiting device numbers to finish. | 🟡 In progress — diagnostics deployed, waiting on device screenshot |
| 10 | P0 | UI | ALL tall bottom-sheet modals (Settings, Detail panel, Add/Edit, Stats…) unscrollable on touch devices since v3.9: framer-motion `drag="y"` on the whole panel captured every vertical touch, starving `overflow-y-auto`. Mouse wheel unaffected → invisible in desktop testing. | ✅ Fixed + deployed — `dragListener={false}` + `useDragControls` from handle/header (PR #62); awaiting real-device confirmation |

Still pending in WS0: `/audit` (async/cache/demo-parity code audit), `/cso` (security), logged-in flow QA, screen-by-screen scroll audit of remaining modals.

---

## Decisions log

- **2026-06-10:** QA loop = gstack headless (`/qa`, `/browse`) as the primary method. Claude in
  Chrome extension rejected for now (not connected; banned in global CLAUDE.md). `/connect-chrome`
  available if live-watching is ever needed.
- **2026-06-10:** Reader Mode — 2B folded into this week (WS4); 2C PDF + Phase 3 deferred.
- **2026-06-10:** Full workspace meta-cleanup approved as WS-meta.
- **2026-06-10:** BYO keys permanent; OpenAI added as second BYO provider; Ollama backup pending spike.

## Working agreements for this overhaul

- Nothing is "done" until verified in a real browser at desktop + mobile widths (+ real device for P0s).
- Project-local skills were self-authored early in the project — read + verify each one before
  relying on it; prefer gstack equivalents where they overlap.
- One concern per commit; quality pipeline before every commit; PRs to main as usual.
- Findings get logged here first, then fixed in priority order — no drive-by fixing during audits.
- Philosophy check still applies: public release ≠ social features. Phase 4 stays frozen.

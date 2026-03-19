# ContentDeck — Documentation Index

> Start here. This file orients each session.

**Version:** v3.7 | **Status:** Phase 1 complete · Pre-Phase 2 backlog complete · Phase 2 (Trusted Curator) COMPLETE ✅ — Obsidian Plugin ✅ · Values Onboarding ✅ · Scoring Engine ✅ · Home Screen ✅ · Reflection Prompt ✅ · Spaced Review ✅ · v3.7 Performance ✅
**Mode: Maintenance.** No new features planned. Next feature work: Phase 3 (Platform) or v4.0 (Intelligence Layer) — both deferred until signals from production use.
**Feedback:** In-app button in Sidebar/MobileHeader → Settings → Feedback tab to review
**Active plan:** [Phase 2 — Trusted Curator](plan/phase-2.md) | **Philosophy:** [Product Philosophy](plan/philosophy.md) | **Feedback tracking:** [user-feedback.md](user-feedback.md)

---

## What to Read

| If you're...                                             | Read these                                                                                                               |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Starting a new feature                                   | [plan/philosophy.md](plan/philosophy.md) + [plan/phase-2.md](plan/phase-2.md) + [guides/workflow.md](guides/workflow.md) |
| Questioning whether a feature belongs                    | [plan/philosophy.md](plan/philosophy.md) — Philosophy-First Feature Review                                               |
| Planning Phase 2 Trusted Curator features                | [plan/phase-2.md](plan/phase-2.md)                                                                                       |
| Understanding the vision                                 | [plan/vision.md](plan/vision.md)                                                                                         |
| Debugging something that used to work or refer past work | [log/](log/) — completed plan sections link directly to their log; log files link back to their plan section            |
| Setting up Supabase Auth                                 | [guides/supabase-auth-setup.md](guides/supabase-auth-setup.md)                                                           |
| Checking what's been fixed                               | [reference/audit.md](reference/audit.md)                                                                                 |
| Doing any UI work (colors, spacing, components, themes)  | [reference/design-system.md](reference/design-system.md) — read before touching any bg/text/border class                |
| Looking for integration ideas                            | [reference/integrations.md](reference/integrations.md)                                                                   |
| Planning infrastructure                                  | [plan/infrastructure.md](plan/infrastructure.md)                                                                         |

---

## Directory Map

```
docs/
├── INDEX.md                        ← You are here
├── plan/                           # Future work — gets shorter as features ship
│   ├── philosophy.md               # Product philosophy — THE WHY. Read before any feature.
│   ├── vision.md                   # Vision, architecture evolution, transition strategy
│   ├── phase-1.md                  # Phase 1: Foundation — COMPLETE ✅
│   ├── phase-2.md                  # Phase 2: Trusted Curator (v3.6) — COMPLETE ✅
│   ├── phase-3.md                  # Phase 3: Platform (v4.5) — Browser Extension, CLI
│   ├── phase-4.md                  # Phase 4: Social & Scale — FROZEN (contradicts philosophy)
│   ├── phase-5.md                  # Phase 5: Ecosystem (v6.0)
│   └── infrastructure.md          # DevOps, budget, quality gates, priority matrix
├── log/                            # Implementation records — append-only
│   ├── v2-migration.md             # v1→v2 React migration plan + record
│   ├── v3.0-auth.md                # 1.1 Supabase Auth
│   ├── v3.0-bookmarklet.md         # 1.1a Bookmarklet fix
│   ├── v3.0-ios-shortcut.md        # 1.1b iOS Shortcut fix
│   ├── v3.0-metadata-fix.md       # 1.2a Metadata quality fix
│   ├── v3.0-content-extraction.md # 1.2b Content extraction pipeline
│   ├── v3.0-areas-tagging-redesign.md # Areas & tagging two-tier model
│   ├── v3.0-full-text-search.md    # 1.3 Full-text search
│   ├── v3.0-reader-mode.md         # 1.5 Reader mode
│   ├── v3.0-testing-ci.md         # 1.6 Testing & CI (Vitest + GitHub Actions)
│   ├── v3.0-bug-fixes-session1.md # Session 1: metadata races, filter independence, PWA back button
│   ├── v3.1-book-capture-without-url.md # Session 2: optional URL for books, author field
│   ├── v3.1-feedback-capture.md   # In-app feedback capture system (#20)
│   ├── v3.1-pwa-autoupdate-feedback-status-fix.md # Session 3: PWA auto-update + feedback status save
│   ├── v3.2-sentry-github-sync.md  # Sentry + GitHub Issues sync (#21 #22) + full Sentry coverage (#25)
│   ├── v3.2-bookmarklet-dedup.md   # Bookmarklet deduplication fix (#27)
│   ├── v3.4-obsidian-export-phase-a.md  # Obsidian export Phase A: areas wikilinks, auto-export, batch, reflection
│   ├── v3.4-obsidian-plugin-phase-b.md  # Obsidian Community Plugin (Phase B): sync-done edge function + BRAT plugin
│   ├── v3.5-trusted-curator.md          # Phase 2.1+2.2+2.3 — Values Onboarding, Scoring Engine, Home Screen
│   ├── v3.5-phase-2.4.md                # Phase 2.4 — Just Added strip, Mark Done, Reflection Prompt (240 tests)
│   ├── v3.6-phase-2.5.md               # Phase 2.5 — Spaced Review SM-2 + bug fixes #42 #43 #38 (264 tests)
│   └── v3.7-performance.md             # v3.7 — Code splitting, SW timeout, Sentry deferred, onboarding fix (261 tests)
├── guides/                         # How-to references
│   ├── workflow.md                 # Development practices, session workflow
│   └── supabase-auth-setup.md      # Supabase Auth provider configuration
└── reference/                      # Lookup tables
    ├── audit.md                    # Bug tracking trail (v1→v2→v2.2)
    ├── design-system.md            # Color tokens, component catalog, theme rules, spacing, a11y patterns
    └── integrations.md             # Potential integrations & extensions
```

---

## Shipped Features

| Version | Feature | Log |
|---|---|---|
| v3.7 | Performance: code splitting (34% smaller initial load), SW 4s timeout, Sentry deferred init, onboarding fix (#48, 261 tests) | [log/v3.7-performance.md](log/v3.7-performance.md) |
| v3.6 | Spaced Review (2.5) + ReflectionModal cancel fix + YouTube skipped status (#42 #43 #38, 264 tests) | [log/v3.6-phase-2.5.md](log/v3.6-phase-2.5.md) |
| v3.5 | Close the Loop: Just Added strip + Mark Done on Continue + Reflection Prompt modal (2.4, 240 tests) | [log/v3.5-phase-2.4.md](log/v3.5-phase-2.4.md) |
| v3.5 | Trusted Curator: Values Onboarding (2.1) + Scoring Engine (2.2) + New Home Screen (2.3) | [log/v3.5-trusted-curator.md](log/v3.5-trusted-curator.md) |
| v3.4 | Obsidian Plugin Phase B — `sync-done` edge function + Community Plugin (BRAT-installable, ribbon icon, auto-marks synced) (#37) | [log/v3.4-obsidian-plugin-phase-b.md](log/v3.4-obsidian-plugin-phase-b.md) |
| v3.4 | Obsidian Export Phase A — areas wikilinks, content_deck_id, reflection section, arXiv abstract, auto-export on mark-done, batch export (#36) | [log/v3.4-obsidian-export-phase-a.md](log/v3.4-obsidian-export-phase-a.md) |
| v3.2 | Bookmarklet deduplication — prevent duplicate saves on double-click (#27) | [log/v3.2-bookmarklet-dedup.md](log/v3.2-bookmarklet-dedup.md) |
| v3.2 | Full Sentry coverage (all 14 mutations, unhandledrejection, fire-and-forget chains) | [log/v3.2-sentry-github-sync.md](log/v3.2-sentry-github-sync.md) |
| v3.2 | Sentry error tracking (init, ErrorBoundary, source maps) + GitHub Issues sync (edge function, FeedbackList badge) | [log/v3.2-sentry-github-sync.md](log/v3.2-sentry-github-sync.md) |
| v3.1 | PWA auto-update (skipWaiting on install, informational banner) + feedback status save fix (controlled select) | [log/v3.1-pwa-autoupdate-feedback-status-fix.md](log/v3.1-pwa-autoupdate-feedback-status-fix.md) |
| v3.1 | In-app feedback capture (Feedback button, auto-context snapshot, Settings review tab, 163 tests) | [log/v3.1-feedback-capture.md](log/v3.1-feedback-capture.md) |
| v3.1 | Book capture without URL (optional URL, author field, sentinel pattern, 154 tests) | [log/v3.1-book-capture-without-url.md](log/v3.1-book-capture-without-url.md) |
| v3.0 | Bug fixes: metadata races, filter independence, PWA back button (8 bugs, 139 tests) | [log/v3.0-bug-fixes-session1.md](log/v3.0-bug-fixes-session1.md) |
| v3.0 | Reader mode (full-screen, typography controls, progress, sepia theme) | [log/v3.0-reader-mode.md](log/v3.0-reader-mode.md) |
| v3.0 | Full-text search (excerpt + content.text, debounce, result count, tsvector) | [log/v3.0-full-text-search.md](log/v3.0-full-text-search.md) |
| v3.0 | Testing & CI (Vitest 95 tests, GitHub Actions pipeline) | [log/v3.0-testing-ci.md](log/v3.0-testing-ci.md) |
| v3.0 | Areas & tagging redesign (two-tier model, junction table, AI-aware) | [log/v3.0-areas-tagging-redesign.md](log/v3.0-areas-tagging-redesign.md) |
| v3.0 | Content extraction pipeline (Readability + linkedom) | [log/v3.0-content-extraction.md](log/v3.0-content-extraction.md) |
| v3.0 | Metadata quality fix (YouTube Data API, Twitter, excerpts) | [log/v3.0-metadata-fix.md](log/v3.0-metadata-fix.md) |
| v3.0 | iOS Shortcut (query-param GET) | [log/v3.0-ios-shortcut.md](log/v3.0-ios-shortcut.md) |
| v3.0 | Bookmarklet (edge function + API token) | [log/v3.0-bookmarklet.md](log/v3.0-bookmarklet.md) |
| v3.0 | Supabase Auth (magic link + Google + GitHub OAuth) | [log/v3.0-auth.md](log/v3.0-auth.md) |
| v2.0 | React + Vite + Tailwind migration | [log/v2-migration.md](log/v2-migration.md) |

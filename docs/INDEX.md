# ContentDeck — Documentation Index

> Start here. This file orients each session.

**Version:** v3.0 | **Status:** Full-text search shipped (Phase 1.3 complete)
**Next up:** Import system (1.4) → Reader mode (1.5)
**Active phase:** [Phase 1 — Foundation](plan/phase-1.md)

---

## What to Read

| If you're... | Read these |
|---|---|
| Starting a new feature | [plan/phase-1.md](plan/phase-1.md) + [guides/workflow.md](guides/workflow.md) |
| Planning next feature (1.3+) | [plan/phase-1.md](plan/phase-1.md) |
| Understanding the vision | [plan/vision.md](plan/vision.md) |
| Debugging something that used to work | [log/](log/) — find the relevant implementation log |
| Setting up Supabase Auth | [guides/supabase-auth-setup.md](guides/supabase-auth-setup.md) |
| Checking what's been fixed | [reference/audit.md](reference/audit.md) |
| Looking for integration ideas | [reference/integrations.md](reference/integrations.md) |
| Planning infrastructure | [plan/infrastructure.md](plan/infrastructure.md) |

---

## Directory Map

```
docs/
├── INDEX.md                        ← You are here
├── plan/                           # Future work — gets shorter as features ship
│   ├── vision.md                   # Vision, architecture evolution, principles
│   ├── phase-1.md                  # Phase 1: Foundation — ACTIVE (1.2-1.6)
│   ├── phase-2.md                  # Phase 2: Intelligence (v3.5)
│   ├── phase-3.md                  # Phase 3: Platform (v4.0)
│   ├── phase-4.md                  # Phase 4: Social & Scale (v5.0)
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
│   └── v3.0-testing-ci.md         # 1.6 Testing & CI (Vitest + GitHub Actions)
├── guides/                         # How-to references
│   ├── workflow.md                 # Development practices, session workflow
│   └── supabase-auth-setup.md      # Supabase Auth provider configuration
└── reference/                      # Lookup tables
    ├── audit.md                    # Bug tracking trail (v1→v2→v2.2)
    └── integrations.md             # Potential integrations & extensions
```

---

## Shipped Features

| Version | Feature | Log |
|---|---|---|
| v3.0 | Full-text search (excerpt + content.text, debounce, result count, tsvector) | [log/v3.0-full-text-search.md](log/v3.0-full-text-search.md) |
| v3.0 | Testing & CI (Vitest 95 tests, GitHub Actions pipeline) | [log/v3.0-testing-ci.md](log/v3.0-testing-ci.md) |
| v3.0 | Areas & tagging redesign (two-tier model, junction table, AI-aware) | [log/v3.0-areas-tagging-redesign.md](log/v3.0-areas-tagging-redesign.md) |
| v3.0 | Content extraction pipeline (Readability + linkedom) | [log/v3.0-content-extraction.md](log/v3.0-content-extraction.md) |
| v3.0 | Metadata quality fix (YouTube Data API, Twitter, excerpts) | [log/v3.0-metadata-fix.md](log/v3.0-metadata-fix.md) |
| v3.0 | iOS Shortcut (query-param GET) | [log/v3.0-ios-shortcut.md](log/v3.0-ios-shortcut.md) |
| v3.0 | Bookmarklet (edge function + API token) | [log/v3.0-bookmarklet.md](log/v3.0-bookmarklet.md) |
| v3.0 | Supabase Auth (magic link + Google + GitHub OAuth) | [log/v3.0-auth.md](log/v3.0-auth.md) |
| v2.0 | React + Vite + Tailwind migration | [log/v2-migration.md](log/v2-migration.md) |

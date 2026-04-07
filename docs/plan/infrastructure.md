# Infrastructure & DevOps

> Legend: ✅ Shipped | 🔲 Planned

---

## Testing Pyramid

```
E2E (Playwright)     — 🔲 10 critical user journeys (not yet added)
Component (RTL)      — ✅ Hook tests via @testing-library/react (useBookmarks, useFeedback, etc.)
Unit (Vitest)        — ✅ 470 tests for lib/ functions, query hooks, and critical components
Type checking (tsc)  — ✅ Zero tolerance for type errors (enforced in CI)
```

Current test count: **470 Vitest tests** — all must pass before merge.

---

## CI/CD Pipeline (GitHub Actions — free)

### Actual pipeline (`.github/workflows/ci.yml`)

```yaml
on: [push, pull_request → main]
jobs:
  quality:
    - npm ci
    - npm run format:check    # Prettier
    - npm run lint             # ESLint + typescript-eslint + jsx-a11y
    - npm run typecheck        # tsc --noEmit
    - npm run test             # Vitest (470 tests)
    - npm run build            # Vite production build

  deploy:
    - Vercel auto-deploy on push to main (already configured)
```

Secrets injected at build time: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`

### Planned additions

```yaml
  scheduled:
    - 🔲 Weekly: npm audit (dependency vulnerability scan)
    - 🔲 Weekly: Lighthouse CI score check
    - 🔲 Daily: health check ping to production URL
```

---

## Monitoring & Observability

| Tool | Status | Purpose |
|------|--------|---------|
| **Sentry** | ✅ Active | Runtime error capture, unhandled rejections, source maps |
| **Vercel Analytics** | ✅ Active | Page views, web vitals (via `@vercel/analytics`) |
| **Vercel Speed Insights** | ✅ Active | Core Web Vitals per-route (via `@vercel/speed-insights`) |
| **Supabase Dashboard** | ✅ Available | DB metrics, API usage, auth stats, edge function logs |
| **UptimeRobot** | 🔲 Planned | Uptime monitoring + alerts (free: 50 monitors, 5-min checks) |
| **Custom health endpoint** | 🔲 Planned | `/api/health` edge function for uptime monitors |

**Sentry configuration:**
- `tracesSampleRate: 0.1` — 10% of sessions sampled for performance traces
- Source maps uploaded in CI when `SENTRY_AUTH_TOKEN` is set
- `enabled: !!dsn` — completely inert in local dev without a DSN configured
- Global `unhandledrejection` listener catches promise rejections browser-wide
- `captureException` in: all 14 TanStack Query mutation `onError` callbacks, ErrorBoundary `componentDidCatch`, auth `getSession` `.catch()`, fire-and-forget chains

---

## Security

### Implemented

| Measure | Status | Detail |
|---------|--------|--------|
| RLS | ✅ | All tables — users can only read/write their own rows |
| Token hashing | ✅ | API tokens stored as SHA-256 hash, never plaintext |
| URL scheme validation | ✅ | Edge functions reject non-http/https URLs |
| JWT verification | ✅ | Edge functions verify auth via user-scoped Supabase client |
| Ownership check | ✅ | Edge functions verify `bookmark.user_id === user.id` before acting |
| CORS | ✅ | All edge functions: restrict headers + methods |
| Secrets | ✅ | No secrets in code — all via env vars or Supabase secrets |
| No client-side DB writes via service role | ✅ | Service role key only used in edge functions |
| React XSS protection | ✅ | React auto-escapes all rendered values |

### Planned / Not yet implemented

| Measure | Status | Detail |
|---------|--------|--------|
| Content Security Policy | 🔲 | Strict CSP headers in `vercel.json` |
| DOMPurify | 🔲 | Sanitize rendered HTML in reader mode (Readability output) |
| Input validation (Zod) | 🔲 | Formal schemas for edge function inputs |
| Rate limiting | 🔲 | Edge function per-token rate limits |
| Dependabot | 🔲 | Automated dependency vulnerability PRs |
| `npm audit` in CI | 🔲 | Block high/critical vulnerabilities at merge |

---

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| First Contentful Paint | < 1.5s | Inline CSS spinner in `index.html` prevents blank page |
| Largest Contentful Paint | < 2.5s | 🔲 Not yet measured in CI |
| Bundle size (gzipped) | < 120KB | 🔲 Not yet measured in CI |
| Lighthouse Performance | > 90 | 🔲 Not yet in CI |
| Lighthouse Accessibility | 100 | `eslint-plugin-jsx-a11y` enforces rules at lint time |

### Code Splitting (Planned)

```
Entry chunk:        React, TanStack Query, core UI       (~80KB gzip)
Dashboard chunk:    Feed, source tabs, toolbar            (~20KB gzip)
Detail chunk:       Detail panel, notes, export           (~15KB gzip, lazy)
Modals chunk:       Add/Edit/Settings/Stats/Areas         (~15KB gzip, lazy)
AI chunk:           OpenRouter client, summarization       (~5KB gzip, lazy)
```

Currently the app ships as a single bundle — code splitting is deferred until bundle size becomes a measurable problem.

---

## Free Tier Budget

Every service used must have a free tier sufficient for the project's scale.

| Service | Free Tier | Our Usage | Status |
|---------|-----------|-----------|--------|
| **Supabase** | 500MB DB, 1GB storage, 50K MAU, 500K edge fn invocations | ~50MB DB, <1K MAU | ✅ Active |
| **Vercel** | 100GB bandwidth, 100K fn invocations | ~5GB/mo bandwidth | ✅ Active |
| **GitHub Actions** | 2,000 min/month | ~200 min/month | ✅ Active |
| **Sentry** | 5K events/month | ~500 events/month | ✅ Active |
| **OpenRouter** | Free models (Llama 3.3 70B, Gemma 3, Qwen) | ~500 req/day | ✅ Active |
| **YouTube Data API** | 10K units/day | Occasional metadata lookups | ✅ Active |
| **Microlink** | 50 req/day | Generic title fetching | ✅ Active |
| **UptimeRobot** | 50 monitors, 5-min checks | 0 (not yet configured) | 🔲 Planned |

**Total monthly cost: $0.00**

---

## Quality Gates

### Enforced in CI (every PR and push to main)

1. `npm run format:check` — Prettier formatting
2. `npm run lint` — ESLint with typescript-eslint + jsx-a11y (zero errors required)
3. `npm run typecheck` — TypeScript strict mode, zero errors
4. `npm run test` — all 470 Vitest tests pass
5. `npm run build` — clean Vite production build

### Manual / Aspirational

6. 🔲 Bundle size delta — no more than +5KB gzip without justification
7. 🔲 `npm audit` — no high/critical vulnerabilities
8. 🔲 Lighthouse a11y score >= 95
9. Code review — at least one review (even self-review with Claude Code)

---

## Implementation Priority Matrix

```
                        HIGH IMPACT
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         │  Auth (1.1) ✅    │  AI Summary(2.1) │
         │  Fixes (1.1a/b)✅ │  Extension (3.1) │
         │  Search (1.3) ✅  │  Chat (2.5)      │
         │  Testing (1.6) ✅ │  Public API (3.3)│
         │  Reader (1.5) ✅  │                  │
         │  Sentry ✅        │                  │
         │                  │                  │
LOW ─────┼──────────────────┼──────────────────┼───── HIGH
EFFORT   │                  │                  │    EFFORT
         │  Review (2.6)    │  Offline (3.2)   │
         │  Digest (4.5)    │  Social (4.1-4)  │
         │  RSS (3.7)       │  Obsidian (5.1)  │
         │                  │  Podcasts (5.4)  │
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
                        LOW IMPACT
```

**Execution order**: Top-left quadrant first (high impact, low effort), then top-right (high impact, high effort), then bottom-left, then bottom-right.

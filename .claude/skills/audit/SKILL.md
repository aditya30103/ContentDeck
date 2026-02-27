---
name: audit
description: Deep codebase audit targeting async races, cache consistency, demo parity, and regression-prone patterns.
disable-model-invocation: false
---

# Audit

Deep codebase audit across all quality dimensions, with emphasis on the async/cache/coupling patterns that cause recurring regressions in this project.

## Usage

```
/audit              # Full audit (all categories)
/audit <category>   # Single category (e.g., /audit async, /audit cache)
```

## Execution

Run each category below. For each, **read the actual source code** — don't just run CLI tools. The goal is to find latent bugs that static analysis misses.

---

## Category 1: Build & Static Analysis

Run these commands and report results:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run build
```

Also check:
- [ ] Bundle size vs last known good (511KB JS / 46KB CSS, gzip ~142KB)
- [ ] No inappropriate `eslint-disable` or `@ts-ignore` without justifying comment
- [ ] No `console.log` in production code (ErrorBoundary is acceptable)
- [ ] No TODO/FIXME/HACK/XXX comments that should have been resolved

---

## Category 2: Async Flow Integrity (**HIGH PRIORITY**)

This codebase chains async operations (metadata → extraction → AI tagging). Race conditions and ordering bugs are the #1 source of regressions.

**Read `src/hooks/useBookmarks.ts` carefully and verify:**

- [ ] **Add bookmark flow**: `onSuccess` chains are correctly ordered — metadata fetch completes before AI tagging fires
- [ ] **Refresh metadata flow**: re-triggers all dependent operations (extraction + AI tagging) with the updated bookmark data
- [ ] **No stale closures**: async callbacks reference fresh state, not stale captured variables from mutation `onSuccess`
- [ ] **Error isolation**: failure in one async chain (e.g., metadata) doesn't block others (e.g., extraction)
- [ ] **No fire-and-forget without reason**: every `void asyncFn()` is intentional — the result genuinely doesn't matter, or there's a comment explaining why

**Read `src/lib/metadata.ts` and verify:**
- [ ] **Fallback chains complete**: YouTube → oEmbed → Data API; Twitter → oEmbed → Microlink; Generic → Microlink. No path returns `undefined` silently when it should throw
- [ ] **API rate limits handled**: Microlink 50/day limit — does the code handle 429 responses or just swallow them?
- [ ] **Timeouts**: external API calls (Microlink, YouTube, OpenRouter) have fetch timeouts so a hung request doesn't block the chain indefinitely

**Read `src/lib/ai.ts` and verify:**
- [ ] **Prompt receives all available context**: title, excerpt, URL, source_type, areas, existing tags
- [ ] **AI response validation**: `parseAIJson` handles malformed responses, missing fields, wrong types
- [ ] **Abort signal propagated**: `suggestTags` and `bulkSuggestTags` pass `signal` through to `callOpenRouter`

---

## Category 3: TanStack Query Cache Consistency (**HIGH PRIORITY**)

Optimistic updates that don't match the DB write cause UI glitches and phantom data.

**For every mutation in `useBookmarks.ts`, verify:**

- [ ] **Optimistic update shape matches DB response**: the object written to cache via `setQueryData` has the same fields/types as what Supabase returns
- [ ] **Rollback on error**: every `onMutate` that modifies cache has a corresponding `onError` that restores `context.prev`
- [ ] **No partial updates**: if a mutation updates multiple fields (e.g., tags + areas), the cache update includes all of them, not just one
- [ ] **Invalidation after background ops**: after async chains complete (metadata fetch, extraction, AI tag), the cache is updated or invalidated so the UI reflects the new data

**For `useTagAreas.ts`:**
- [ ] **Junction table consistency**: when an area is deleted, are `bookmark_tags` entries cleaned up (DB-side FK cascade or client-side)?
- [ ] **Rename propagation**: renaming an area doesn't break existing bookmark-area associations (junction table uses FK, not name matching — verify this is true everywhere)

---

## Category 4: Scoring Engine Integrity (Phase 2+)

The scoring engine is the core of the Trusted Curator paradigm. It must be interpretable, deterministic, and correctly derived from existing data.

> **Note:** Demo mode is maintained only for `/library`. New home screen has no demo mode. Run the legacy demo mode checks below only when auditing the library view.

**If the scoring engine exists (`src/lib/scoring.ts` or similar), verify:**

- [ ] **All score factors are named**: no anonymous weight multiplications — every factor has a named variable
- [ ] **Reason generation is deterministic**: `dominantFactor(scores)` returns the same string for the same input, always
- [ ] **Diversity cap enforced**: same tag area cannot win primary slot in two consecutive scoring calls
- [ ] **Long-form suppressed correctly**: items with reading_time > 60 min are filtered from primary slot on weekday evenings (time-of-day context)
- [ ] **Mood override changes output**: each of the 4 mood modes produces a different top item from a known fixture set
- [ ] **Score inputs are all from existing DB fields**: no fields not present on the `Bookmark` type
- [ ] **Test coverage**: every score factor has a unit test with known inputs → expected outputs

**Legacy demo mode checks (library view only):**
- [ ] `mock-supabase.ts` covers all Supabase method chains used in hooks
- [ ] Chainable builder is thenable
- [ ] `functions.invoke()` is stubbed
- [ ] Auth mock behaves correctly

---

## Category 5: Security

- [ ] No secrets in source code (grep for API keys, tokens, passwords)
- [ ] `jsStringEscape` used in bookmarklet generation (`utils.ts`)
- [ ] `yamlEscape` used in Obsidian export (`obsidian.ts`)
- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] Edge function `save-bookmark` validates token before inserting
- [ ] RLS policies: all tables have row-level security, scoped to `auth.uid() = user_id`
- [ ] User input from URL params (`?url=`) is validated before use in share target flow

---

## Category 6: React & UI Patterns

- [ ] All `useEffect` hooks with listeners/subscriptions have cleanup functions
- [ ] No missing dependency array items in `useEffect`/`useMemo`/`useCallback` (check ESLint warnings)
- [ ] Modal focus trapping works (Tab cycles within modal, Escape closes)
- [ ] All icon-only buttons have `aria-label`
- [ ] Touch targets >= 44x44px on all interactive elements
- [ ] Dark/light mode: no hardcoded colors outside Tailwind classes
- [ ] Loading states: skeleton/spinner shown during async operations, no layout shift

---

## Category 7: PWA & Deployment

- [ ] `manifest.json` — correct `start_url`, `share_target`, icons
- [ ] `sw.js` — network-first for navigation, SWR for assets, `CACHE_NAME` version current
- [ ] `vercel.json` — SPA rewrites, immutable cache for `/assets/*`, no-cache for `sw.js`
- [ ] `index.html` — inline CSS spinner, OG meta tags, no render-blocking resources
- [ ] `apple-touch-icon` points to existing file

---

## Category 8: Dependencies

```bash
npm audit
```

- [ ] No high/critical vulnerabilities
- [ ] All `dependencies` are used in production code
- [ ] All `devDependencies` are actually dev-only
- [ ] No duplicate packages in `package-lock.json` (major version conflicts)

---

## Category 9: Documentation Drift

Compare source code against docs — flag any mismatches:

- [ ] **`CLAUDE.md`** — architecture section matches actual `src/` structure, key patterns are current
- [ ] **`docs/INDEX.md`** — shipped features list is complete, "next up" is accurate
- [ ] **`docs/plan/phase-1.md`** — completed items marked correctly
- [ ] **`README.md`** — features, setup steps, project structure match reality
- [ ] **`docs/reference/audit.md`** — no stale open issues that have been fixed
- [ ] **`docs/log/`** — every shipped feature has a log entry (no missing logs)

---

## Category 10: Mobile Parity

Desktop and mobile are rendered by separate component trees. Features added to the desktop sidebar must be manually mirrored in mobile components. Read `src/components/layout/Sidebar.tsx` and `src/components/layout/MobileNav.tsx` and verify:

**Navigation parity — Sidebar vs MobileNav:**

| Feature | Desktop (Sidebar) | Mobile (MobileNav) | Status |
|---------|-------------------|--------------------|--------|
| Unread filter | ✅ statusNav | ✅ tabs array | OK |
| Reading filter | ✅ statusNav | ✅ tabs array | OK |
| Done filter | ✅ statusNav | ✅ tabs array | OK |
| Favorites filter | ✅ Star button | ✅ Star tab | OK |
| Areas/List view toggle | ✅ View section | ✅ toggle button | OK |
| All Bookmarks (no filter) | ✅ statusNav | ❌ not in mobile | Known gap |

**Action parity — Sidebar footer vs MobileHeader:**

| Feature | Desktop (Sidebar footer) | Mobile (MobileHeader) | Status |
|---------|--------------------------|----------------------|--------|
| Add bookmark | ✅ New Bookmark button | ✅ + button | OK |
| Search | ✅ FeedToolbar | ✅ Search button | OK |
| Settings | ✅ footer button | ✅ gear button | OK |
| Theme toggle | ✅ footer button | ✅ sun/moon button | OK |
| Statistics | ✅ footer button | ❌ not on mobile | Known gap |
| Sign Out | ✅ footer button | ❌ not on mobile (via Settings modal?) | Verify |

**Checks:**
- [ ] Any new item added to Sidebar navigation is also in MobileNav
- [ ] Any new action added to Sidebar footer is also in MobileHeader or MobileNav
- [ ] Known gaps (Statistics on mobile, All Bookmarks on mobile) are either accepted or filed as issues
- [ ] No TypeScript type mismatch between `MobileNavProps.counts` and what AppShell passes

---

## Output Format

### Summary Table

| Category | Status | Findings |
|----------|--------|----------|
| Build & Static Analysis | PASS/FAIL | count |
| Async Flow Integrity | PASS/WARN/FAIL | count |
| Cache Consistency | PASS/WARN/FAIL | count |
| Scoring Engine Integrity | PASS/WARN/FAIL/N/A | count |
| Security | PASS/FAIL | count |
| React & UI Patterns | PASS/WARN/FAIL | count |
| PWA & Deployment | PASS/WARN/FAIL | count |
| Dependencies | PASS/WARN/FAIL | count |
| Documentation Drift | PASS/WARN/FAIL | count |
| Mobile Parity | PASS/WARN/FAIL | count |

### Findings Detail

For each finding, provide:

```
[CRITICAL|HIGH|MEDIUM|LOW] Category > Subcategory
File: path/to/file.ts:line
Issue: What's wrong
Impact: What could break
Fix: Specific action to take
```

### Severity Definitions

- **CRITICAL**: Will cause data loss, security breach, or crash in production
- **HIGH**: Will cause user-visible bugs under normal usage
- **MEDIUM**: Will cause bugs under edge cases, or degrades DX significantly
- **LOW**: Code smell, minor inconsistency, or improvement opportunity

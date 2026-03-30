# User Feedback Scratchpad

> Drop all feedback here — bugs, UX complaints, feature requests, anything.
> At the start of a session, share this file and we'll triage together.

---

## Pending (unreviewed)

<!-- Paste new feedback here -->

---

## Mobile UX — Gesture Layer (v3.9, 2026-03-30)

### Track 1 — Layout & Rendering ✅ COMPLETE (PR #56, v3.8)
- MobileHeader slimmed to 3 buttons, CSS 100dvh foundation, overscroll elimination, input zoom fix, AppShell overscroll contain, input text-sm audit

### Track 2 — Framer Motion Gestures ✅ COMPLETE (v3.9)
- ✅ `framer-motion` installed, `vendor-motion` chunk (42.5KB gzip, deferred)
- ✅ `src/lib/motion.ts` — shared thresholds + spring configs
- ✅ `src/hooks/useIsMobile.ts` — matchMedia hook
- ✅ **DetailPanel**: bottom sheet drag-to-dismiss (40% or 500px/s), drag handle pill, backdrop fade, desktop slide-in
- ✅ **Modal.tsx**: all 8 modals — slide-up + drag-to-dismiss on mobile, fade+scale on desktop
- ✅ **ReaderModal**: slide-in from right, swipe-right-to-dismiss with `dragDirectionLock`
- ✅ **MobileNav**: count badges (icon overlay), 44px height, content padding trimmed
- → [Implementation log](log/v3.9-gestures.md)

### Track 3 — Deferred Gestures (next gesture session)

| Gesture | Notes |
|---------|-------|
| **Pull-to-refresh** | `usePullToRefresh` hook, 64px threshold, resistance curve. Must return `MotionValue<number>`, accept `RefObject<HTMLElement>` |
| **Route transitions** | `AnimatePresence mode="wait"` + `useLocation` key in App.tsx. Only 2 routes — low priority |
| **Card swipe actions** | Swipe bookmark cards left/right for quick actions (delete, mark done). Per-card gesture handlers — evaluate after more production use |

### Key lessons (do NOT repeat)
- `min-h-[100dvh]` ≠ `h-[100dvh]` — use fixed height on scroll containers
- `usePullToRefresh` must return `MotionValue<number>` for `pullDistance`, not a plain number
- `usePullToRefresh` must accept `RefObject<HTMLElement>`, not `HTMLElement | null` (stale-ref problem)
- `if (!open) return null` guard must be removed when `AnimatePresence` controls mounting — guard fires during exit animation and kills it
- `dragDirectionLock` is the correct pattern for horizontal drag coexisting with vertical scroll
- Do NOT use the superpowers plugin — its subagent-driven workflow conflicts with our codebase's established patterns and skill workflows

---

## Triaged

### [BUG P0] Metadata / title not loading on save — two distinct race conditions
**Reported:** 24 Feb | **Status:** Confirmed, root causes identified (deep dive)

**Race Condition A — Substack / blog (triggerExtraction clobbers metadata):**
- `triggerExtraction` and `autoFetchMetadataAndTag` both fire as `void` in parallel from `addBookmark.onSuccess`
- Edge function completes → `queryClient.invalidateQueries` fires → full DB refetch while Microlink is still fetching
- Refetch lands before `autoFetchMetadataAndTag` writes to DB → stale snapshot overwrites cache
- Metadata WAS written to DB — manual refresh re-reads the correct DB state

**Race Condition B — Startup batch enrichment (Dashboard.tsx:129):**
- The `enrichAndTag` effect runs on load for all bookmarks with `!b.title`
- DB writes inside the batch are `void` (fire and forget inside `Promise.allSettled`)
- `invalidateQueries` at line 143 fires immediately after `fetchMetadata` calls resolve — BEFORE DB writes complete
- Fix: `await db.from('bookmarks').update(...)` inside the batch, not `void`

**YouTube (channel/duration) specific:**
- Extraction is skipped for YouTube so Race A doesn't apply
- Most likely cause: `autoFetchMetadataAndTag` succeeds but the cache update uses `enriched = { ...newBookmark, ...updates }` where `newBookmark` came from the plain `.insert().select()` (no junction table join → `areas: []`)
- If `setBookmarkAreas` had already put areas in cache, this overwrites them, causing a visible flicker
- Additionally: if the DB write inside `autoFetchMetadataAndTag` fails silently (network jitter, auth expiry), `if (!error)` blocks the cache update too — so channel/duration never appear until manual refresh retries successfully
- The startup `enrichAndTag` batch only re-fetches for `!b.title` — YouTube bookmarks with a title but no channel/duration are permanently orphaned unless manually refreshed

### [BUG P1] Areas flash and disappear after adding a bookmark with areas assigned
**Reported:** 24 Feb (found during deep dive) | **Status:** Confirmed
- In `addBookmark.onSuccess` (useBookmarks.ts): sets cache with `newBookmark` (areas: []), fires `void autoFetchMetadataAndTag(newBookmark)`
- Dashboard.tsx callback fires `void setBookmarkAreas(...)` which updates cache with correct areas
- `autoFetchMetadataAndTag` completes ~1-2s later: updates cache using `{ ...newBookmark, ...updates }` — `newBookmark.areas = []` — OVERWRITES the areas set by `setBookmarkAreas`
- Areas then come back only after `triggerExtraction`'s `invalidateQueries` or manual page action
- Fix: in `autoFetchMetadataAndTag`, merge areas from current cache state, not from the stale `newBookmark`

### [BUG P1] Twitter title includes embedded t.co URL
**Reported:** 24 Feb | **Status:** Confirmed
- Twitter always appends a t.co link to tweet HTML (for any media or link in the tweet)
- Our regex strips HTML tags but not URL text — so title becomes `"Author: Great article https://t.co/xyz123"`
- Fix: strip `https?://\S+` URL patterns from extracted tweet text before building the title

### [BUG P1] Uncategorized count mismatches what appears in list
**Reported:** 24 Feb | **Status:** Confirmed, logic inconsistency
- `AreasView.tsx:28` counts uncategorized as `b.areas.length === 0` (no areas, may have tags)
- `BookmarkList.tsx:59-61` `__untagged__` filter requires `b.areas.length === 0 AND b.tags.length === 0`
- Fix: align to `b.areas.length === 0` only — "uncategorized" in the Areas view means unassigned to an area; tags are a separate dimension

### [BUG P1] Back button in PWA closes the app instead of closing Reader
**Reported:** 24 Feb | **Status:** Confirmed
- ReaderModal opens with no browser history entry — Android/iOS back gesture = `popstate` = browser navigation away from SPA
- Also affects: any full-screen modal (Add, Edit, Settings) in PWA context
- Fix: `history.pushState({modal: 'reader'}, '')` on open; `popstate` listener in ReaderModal calls `onClose()` and `e.preventDefault()`

### [BUG P1] Favorites × Area filter can't be combined; status tabs clear area too
**Reported:** 24 Feb | **Status:** Confirmed — filter logic is correct, nav actions are wrong
- `BookmarkList.tsx` filter pipeline correctly stacks all dimensions independently ✓
- Bug is in navigation actions:
  - Sidebar Favorites: `setFavorites(true); setStatus('all'); setTag(null)` → clears area
  - Sidebar status tabs: `setStatus(x); setTag(null); setFavorites(false)` → clears area AND favorites
  - MobileNav status tabs: `setStatus(x); setFavorites(false)` → clears favorites
- Design principle (confirmed by user): each filter dimension (status / source / area / favorites) is independent; changing one must not reset others
- Fix: remove cross-clearing from all nav actions. Each setter only changes its own dimension.

---

### Deep Dive: Associated Bug Families

#### Family 1 — Race conditions from over-use of `invalidateQueries`
All three locations that fire `invalidateQueries` can race with concurrent async writes:
1. `triggerExtraction` → after edge function completes [confirmed P0]
2. Dashboard.tsx `enrichAndTag` batch → after fetchMetadata resolves but before `void` DB writes complete [confirmed P1]
3. Dashboard.tsx AI tagging loop → `invalidateQueries` at line 168 after tagging loop, same risk

**Fix pattern**: Replace full `invalidateQueries` with targeted cache merges. Only use `invalidateQueries` when you know all DB writes have settled.

#### Family 2 — Silent failure (catch {} swallows everything)
No errors are surfaced to the developer or user for:
- `autoFetchMetadataAndTag` — metadata fetch + DB write errors
- `triggerExtraction` — edge function errors
- `autoSuggestTags` — AI tagging errors
- Per-bookmark errors in `enrichAndTag` batch
This makes debugging production failures impossible. The Microlink 50 req/day rate limit, YouTube API quota, OpenRouter rate limits — all silently fail.
**Fix**: At minimum, `console.warn` on failures during development. Consider showing a subtle persistent badge when enrichment fails.

#### Family 3 — Cache updates using stale insert data (no junction join)
`addBookmark.mutationFn` uses `.insert().select()` without the `bookmark_tags(...)` join. The returned `newBookmark` has `areas: []`. Any subsequent cache update using `{ ...newBookmark, ... }` clobbers areas populated by `setBookmarkAreas`. This is the root of the areas-flash bug and could affect any other feature that does similar spread-merge.
**Fix**: In `autoFetchMetadataAndTag` and any post-add enrichment, read `areas` from the current cache state, not from `newBookmark`.

#### Family 4 — Startup batch ignores partially enriched bookmarks
`enrichAndTag` filters: `bookmarks.filter((b) => !b.title)`. Bookmarks with a title but no `metadata.channel`, `metadata.duration`, or `image` are never re-enriched by the startup pass. These sit "half-enriched" permanently — only fixable by manually pressing refresh on each one.
**Fix**: Widen the startup filter to catch bookmarks missing key fields per their source type (e.g., YouTube with no `metadata.channel`).

#### Family 5 — OpenRouter rate limiting / AI tag quality
Free model rate limits on OpenRouter hit silently. The AI tagging fires for every new bookmark. No debounce, no backoff, no queue. Under normal usage this is fine, but bursts (adding 5+ bookmarks quickly) will hit limits.
**Fix** (lower priority): Queue AI tagging requests with a small delay between them.

---

### [FEATURE P1] Book capture without a URL
**Reported:** 24 Feb | **Status:** Planned
- `book` source type exists but URL is required in the add modal — books tab is effectively unused
- Desired: Log any book immediately (from recommendation, article, conversation)
  - URL optional (Goodreads/Amazon link if available, but not required)
  - Author field (book-specific metadata)
  - Status: Want to Read (unread) / Reading (reading) / Finished (done) — maps naturally to existing status
  - Notes + Obsidian export already work — no changes needed
- NOT in scope now: Apple Books API sync, in-app reading
- Fix direction: Make URL optional when source_type = 'book' in AddBookmarkModal; add author field

### [FEATURE P2] Obsidian export: tags as wikilinks
**Reported:** 24 Feb | **Status:** Planned
- Currently exports `tags: ["tag1", "tag2"]` in YAML frontmatter
- Desired: `[[tag1]]` wikilink format for Obsidian backlink graph integration
- Fix direction: Add toggle in export options OR always use `[[tag]]` in YAML

### [FEATURE P2] GitHub repository source type
**Reported:** 24 Feb | **Status:** Planned
- Detect `github.com/*/*` URLs, fetch repo metadata via GitHub public API (no key needed)
- Metadata: repo name, description, stars, language, topics

### [DONE] arXiv paper source type + CORS fix (PR #58 — 2026-03-30)
- arXiv source type shipped in v3.3; CORS bug fixed via `fetch-arxiv-metadata` Edge Function (PR #58, closes #52)

### [FEATURE P3] YouTube transcript extraction
**Reported:** 24 Feb | **Status:** Backlog

### [FEATURE P3] Warm/Sepia theme for main app
**Reported:** 24 Feb | **Status:** Backlog
- Reader mode already has sepia; main app dashboard is zinc-only

### [QUALITY P1] Fix tests to catch race conditions and metadata failures
**Reported:** 24 Feb | **Status:** Planned
- Current tests mock `fetchMetadata` entirely — race conditions and real failure modes are invisible
- Need: test for `triggerExtraction` → `invalidateQueries` race
- Need: test that areas are preserved after `autoFetchMetadataAndTag` completes
- Need: test that `enrichAndTag` batch awaits DB writes before invalidating

---

## Session Plan

### Session 1 — All bugs + quality (current)
| # | Fix | Difficulty |
|---|-----|------------|
| 1 | Fix Race A: sequence `autoFetchMetadataAndTag` before `triggerExtraction` | Medium |
| 2 | Fix Race B: `await` DB writes in `enrichAndTag` batch (Dashboard.tsx:129) | Easy |
| 3 | Fix areas-flash: preserve cache areas in `autoFetchMetadataAndTag` update | Medium |
| 4 | Fix startup batch: widen filter to catch bookmarks missing metadata by source type | Easy |
| 5 | Fix Twitter: strip t.co URL from tweet text | Easy |
| 6 | Fix uncategorized count definition | Easy |
| 7 | Fix back button: pushState + popstate in ReaderModal | Medium |
| 8 | Fix filter cross-clearing in Sidebar + MobileNav | Easy |
| 9 | Quality: add tests for the above | Medium |

### Session 2 — Book source type (Feature P1) ✓ DONE (PR #19)
### Pre–Phase 2 backlog (schedule before AI features):
- **Session 3** — GitHub + arXiv source types + Obsidian wikilinks (Feature P2)
- **Session 4** — Quality coverage: race condition tests, metadata failure tests (Quality P1)

---

## Done / Shipped

### [DONE] Metadata race conditions (PR #16 — Session 1)
- Race A: triggerExtraction no longer races with autoFetchMetadataAndTag — sequenced
- Race B: startup batch now awaits DB writes before invalidateQueries
- YouTube channel/duration: startup batch widens filter to catch partially-enriched YouTube bookmarks
- Areas flash: cache update now merges into live cache state, not stale insert data

### [DONE] Twitter title includes t.co URL (PR #16 — Session 1)
- t.co URLs stripped from tweet text before building title

### [DONE] Uncategorized count mismatch (PR #16 — Session 1)
- BookmarkList `__untagged__` filter now checks areas only (not tags)

### [DONE] PWA back button closes app (PR #16 — Session 1)
- ReaderModal pushes history entry on open; popstate listener closes reader instead of navigating away

### [DONE] Favorites filter not propagating to AreasView/SourceTabs/StatusFilters (main, 2026-02-24)
- Root cause: Dashboard.tsx never read showFavorites from useUI(), so statusFiltered was status-only
- AreasView area counts, SourceTabs source counts, StatusFilters pills all showed wrong totals
- Fix: showFavorites included in statusFiltered useMemo; sidebar divider added before Favorites

### [DONE] Favorites × Area filter can't combine (PR #16 — Session 1)
- Sidebar and MobileNav nav actions no longer cross-clear filter dimensions
- Favorites is now a toggle; status tabs only change status

### [DONE] Book capture without URL (PR #19 — Session 2)
- URL optional for book source type; author field added
- isBookWithoutUrl() sentinel pattern; URL-specific UI hidden for URL-less books
- Obsidian export handles books cleanly (no url frontmatter, no Open original link)
- 15 new tests; 154 total passing

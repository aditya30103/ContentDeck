# Reader Mode Overhaul

> Goal: Turn Reader Mode from a plain-text dump into the primary reading surface — so the Consume → Reflect → Review loop (Phase 2) can actually close.
> Philosophy anchor: `docs/plan/philosophy.md` — "The session is the unit, not the item." If reading in-app is worse than the source URL, every downstream feature (reflection, review, scoring) degrades.

**Status:** Phase 1 SHIPPED + Phase 2 PARTIAL (2A, 2D, 2E, 2F) — shipped in v3.10.0 (2026-04-17). Phase 2 remainder (2B, 2C) and Phase 3 deferred.
**Audit date:** 2026-04-17
**Estimated scope:** 3 phases, ~2–3 sessions each. Each phase independently shippable.

---

## Why this exists

After 2 months of iteration, Reader Mode is the only significant feature that has never been revisited since v3.0 (2026-02-18). The audit found three structural problems:

1. **Lossy pipeline by design.** `supabase/functions/extract-content/index.ts` calls Readability and stores only `article.textContent`. The rich `article.content` (sanitized HTML with headings, code, links, images, blockquotes, lists) is discarded. `src/lib/reader.ts` then tries to *reconstruct* structure from plain text using fragile heuristics.
2. **Single-path extraction.** `phase-1.md §1.2` specified Readability → Microlink → title-only fallback. Only Readability was built. No retry, no PDF path, no fallback, bot-detecting `User-Agent: ContentDeck/1.0`.
3. **Promised features never shipped.** `phase-1.md §1.5` specified highlighting, reading progress persistence, offline reading, and summaries. None exist.

Consequence: users correctly bypass Reader Mode and click the source URL, which breaks the premise of Phase 2's reflection/review loop (2.4 ReflectionModal fires on mark-done; if the user marks-done outside the app, it never fires).

Full audit: this file §Appendix A.

---

## Non-negotiables (apply to every phase)

1. **Zero vendor lock-in, free-tier only.** No paid APIs. Every fallback must have a free tier or be self-hosted in the edge function.
2. **Non-breaking.** Existing bookmarks with `content.text` still render; new columns are additive until backfill completes.
3. **4-theme verification.** Every UI change checked in Light / Dark / Sepia / Navy before ship. Reader-specific themes (`light | dark | sepia`) kept separate from app theme.
4. **Progressive enhancement.** Every new feature degrades cleanly when its input is missing (no HTML → fall back to text; no summary → hide the summary card; no highlights → render article unchanged).
5. **Silent failure is not acceptable.** Every extraction path surfaces its state to the UI or Sentry. Carry forward the v3.9.3 audit discipline.
6. **Touch targets 44×44. `motion-safe:` / `motion-reduce:` variants on every animation.**

---

## Build order

The sequence matters. Each phase unlocks the next; do not parallelise.

```
Phase 1 — Pipeline rebuild          ← foundational. Store HTML, render HTML, kill heuristics.
    ↓
Phase 2 — Reliability               ← makes Reader usable for the majority of saves.
    ↓
Phase 3 — Value unlock              ← summary, progress, highlights, transcript UX.
```

Phase 1 is a prerequisite for everything else. Phase 2 can be split into sub-shippable pieces. Phase 3 items are independently shippable once Phase 1 lands.

---

## Phase 1 — Pipeline Rebuild

**Status:** ✅ SHIPPED in v3.10.0 (2026-04-17)
**Priority:** PREREQUISITE (blocks Phase 2 & 3)
**Target version:** v3.10

### Why

Readability returns sanitized semantic HTML. We already have it in memory inside the edge function. Storing and rendering it directly eliminates the entire `src/lib/reader.ts` heuristic stack and restores everything users miss: headings, code, links, images, lists, blockquotes, emphasis.

### What ships

1. **Edge function stores HTML.** `article.content` (DOMPurify-sanitized) written to `content.html` alongside existing `content.text`. Both are preserved; `content.text` remains canonical for full-text search and word count.
2. **Client renders HTML via `@tailwindcss/typography`.** Reader Modal uses `.prose prose-sm|base|lg dark:prose-invert` on a single `<div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />`. No more block parser.
3. **`src/lib/reader.ts` deleted.** Heuristic parser is gone. Tests deleted with it.
4. **Backfill is lazy.** No mass re-extraction. A bookmark with old `content.text` but no `content.html` renders using the plain-text path (graceful degradation). A "Re-extract" affordance in the detail panel re-runs extraction and upgrades it.

### Files

**Edge function:**
- `supabase/functions/extract-content/index.ts`
  - Add `isomorphic-dompurify@2` (Deno-compatible) or a conservative allow-list sanitizer. Allow: `h1–h6, p, ul, ol, li, pre, code, blockquote, a, img, figure, figcaption, strong, em, br, hr, table, thead, tbody, tr, td, th`. Strip: `script, style, iframe, form, input, button, on*` attrs, `javascript:` URLs.
  - On success, write both: `content.text` (existing) + `content.html` (new). `content.method` unchanged.
  - Add `content.html_byte_size` for telemetry; log when > 200 KB.

**Client:**
- `src/types/index.ts` — add `html?: string` and `html_byte_size?: number` to `BookmarkContent`.
- `src/components/reader/ReaderModal.tsx` — render `content.html` (sanitize again client-side with DOMPurify for defence-in-depth) inside a `.prose` container. Fall back to the current block-render path only if `content.html` is absent.
- `src/lib/reader.ts` — **delete**.
- `src/components/__tests__/ReaderModal.test.tsx` — replace block-assertion tests with HTML-rendering tests.

**Dependencies:**
- `npm i @tailwindcss/typography dompurify @types/dompurify isomorphic-dompurify`
- `index.css` — register `@plugin '@tailwindcss/typography'` (Tailwind v4 CSS-first). Customise `.prose` for 4 reader themes using CSS variables already defined for `light | dark | sepia`.

**No SQL migration needed.** `content` is `JSONB` — new keys are accepted with no schema change (per CLAUDE.md / memory).

### Sanitization policy

Two-pass sanitization — defence in depth.

1. **Edge-time (server):** `isomorphic-dompurify` with above allow-list. Stored HTML is already safe at rest.
2. **Render-time (client):** DOMPurify again before `dangerouslySetInnerHTML`. Protects against any migration accident, manual DB edit, or future `content.html` source that wasn't edge-sanitized.

`a[href]` must be rewritten to `target="_blank" rel="noopener noreferrer"` at render time.
`img[src]` — consider a CSP `img-src` directive and lazy-loading (`loading="lazy" decoding="async"`). External images are OK; no proxy for v1.

### Tests

Create `src/test/fixtures/reader/`:
- `fixture-tech-blog.html` — code-heavy post with `<pre><code>`, inline `<code>`, links, H2/H3.
- `fixture-substack.html` — long-form essay with blockquotes, images, footnotes.
- `fixture-arxiv-html.html` — academic HTML with equations (verify MathJax/KaTeX fallback).
- `fixture-paywalled.html` — content hidden behind JS (expect Readability to return shallow content; extraction marked `failed`).

Write `src/components/__tests__/ReaderModal.test.tsx` cases:
- Renders `<pre><code>` from `content.html` with `.prose` typography.
- Renders images with `loading="lazy"`.
- `<a>` tags get `target="_blank" rel="noopener noreferrer"`.
- `<script>` in `content.html` is stripped by render-time DOMPurify.
- Falls back to legacy block render when `content.html` is absent.

### Acceptance criteria

- [ ] An article with code blocks renders with monospace formatting and visible indentation.
- [ ] An article with inline images renders them.
- [ ] Links inside the article open in a new tab without referrer leakage.
- [ ] `src/lib/reader.ts` is deleted; Vitest passes.
- [ ] Existing bookmarks without `content.html` still render (text path).
- [ ] Reader Modal dark/sepia themes correctly re-style `.prose` content.

### Risks

- **Bundle size.** `@tailwindcss/typography` adds ~7–10 KB gzipped to CSS; DOMPurify adds ~15 KB gzipped. Total < 30 KB. Code-split acceptable (Reader Modal is already lazy-loaded via `React.lazy` as of v3.7).
- **Sanitization regressions.** Mitigated by two-pass sanitization + fixture tests.
- **Stale `content.html` if sanitizer policy changes.** Accept: on policy change, invalidate entire `content.html` column via a nullable flag; let `extract-content` re-populate on next open. Not in v3.10 scope.

---

## Phase 2 — Reliability

**Status:** 🟡 PARTIAL — 2A, 2D, 2E, 2F shipped in v3.10.0 (2026-04-17). 2B (Postlight + Microlink fallback) and 2C (PDF extraction) deferred — both require Deno-compat verification for the ESM CDN imports.
**Priority:** HIGH (expands the set of URLs Reader Mode can handle)
**Target version:** v3.11 (remaining: 2B + 2C)

### Why

Single-path extraction with a bot-detecting UA fails on paywalls, Cloudflare-fronted sites, PDFs, and anything JS-rendered. When extraction fails, the Read button is hidden entirely — the user has no signal that Reader Mode exists for that bookmark. This phase closes the long tail.

### What ships

#### 2A. Realistic UA + retry/backoff

- Edge function UA → `Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15` (Safari looks less bot-like than Chrome to some CDNs).
- On `429 | 500 | 502 | 503 | 504`, retry twice with exponential backoff (1 s, 3 s). Respect `Retry-After` if present.
- On `403`, do not retry — fall through to fallback chain (2B).

#### 2B. Fallback chain

Per `phase-1.md §1.2`. Sequenced, each step only runs if previous failed:

1. **Readability** (current).
2. **`@postlight/parser`** (self-hosted in the edge function; a different extraction algorithm that handles some sites Readability can't). Free, open source.
3. **Microlink Article API.** Free tier 50 req/day — sufficient for personal-scale backup. Requires no auth. Extracts title + description + image + text for stubborn URLs.
4. **Last resort:** title + excerpt only, `content_status: 'partial'` (new state).

Each step short-circuits on first success. Record which method succeeded in `content.method` (values: `'readability' | 'postlight' | 'microlink' | 'partial' | 'failed'`).

#### 2C. PDF extraction

- Content-type sniffing: if `Content-Type: application/pdf` or URL ends in `.pdf`, route to PDF path.
- Use `pdfjs-dist` (Mozilla, free, Deno-compatible via esm.sh). Extract text page-by-page; skip images.
- Cap at 500 KB (Phase 2D) text; add `content.page_count` and `content.pdf_source: true`.
- Store text only; no HTML for v1. Render in Reader as plain text with paragraph breaks on double-newlines.

#### 2D. Raise truncation cap + UI signal

- Raise `TEXT_CAP` from 100 KB → 500 KB (covers ~80k words; handles near-all essays and papers).
- Add `content.truncated: boolean` field.
- Reader footer shows a "Truncated at X words — [Open original]" notice when `truncated === true`.

#### 2E. Extraction-failed state inside Reader

Today the Read button is hidden for `failed`/`skipped`, so the user never knows Reader exists for that bookmark. Change:
- Always show the Read button if `bookmark.url` exists and source is extractable.
- On open, if `content_status === 'failed'`: render an empty state with "Extraction unavailable for this source. [Retry] [Open original in browser]".
- On open, if `content_status === 'partial'`: render the excerpt + a "Could not extract full article" banner.

#### 2F. Reading-progress persistence

- Store `scroll_pct` in localStorage keyed by bookmark ID: `reader_progress:${bookmark.id}`.
- On open, if value exists and > 5%, show a "Resume from X%" floating pill (tap to scroll); otherwise scroll to top.
- Throttled `scroll` handler writes (every 500 ms, max 4 per second). Clears on status → `done`.
- **Non-goal v1:** sync across devices. DB column deferred to v4.0. Local persistence is good enough for personal use.

### Files

**Edge function:**
- `supabase/functions/extract-content/index.ts`
  - Add UA constant, retry wrapper.
  - Extract the current Readability block into a `tryReadability(html, url)` helper.
  - Add `tryPostlight(html, url)` and `tryMicrolink(url)` helpers.
  - Add `tryPdf(buffer, url)` using `pdfjs-dist`.
  - Sequence: PDF check → Readability (with retry) → Postlight → Microlink → Partial → Fail.

**Client:**
- `src/components/reader/ReaderModal.tsx` — failed-state empty view, partial-state banner, truncation notice, resume pill.
- `src/components/detail/DetailPanel.tsx` — always render Read button when URL exists; disable only while `extracting`.
- `src/hooks/useReaderPrefs.ts` — extend or new hook `useReaderProgress(bookmarkId)` with get/set/clear.
- `src/hooks/__tests__/useReaderProgress.test.ts` — new.

**Types:**
- `src/types/index.ts`
  - `ContentStatus` add `'partial'`.
  - `BookmarkContent` add `truncated?: boolean`, `method` value `'postlight' | 'microlink' | 'partial'`, `page_count?: number`, `pdf_source?: boolean`.

**Dependencies (edge function, ESM CDN imports — no package.json change):**
- `@postlight/parser`
- `pdfjs-dist` (check Deno compatibility; if broken, fall back to `pdf-parse`)

### Tests

- `supabase/functions/extract-content/__tests__/` — unit tests for the helper functions using static HTML fixtures. Deno test runner or lifted to `vitest` via an import alias; confirm with existing edge-function test tooling (if none, add Deno test file).
- `src/components/__tests__/ReaderModal.test.tsx`:
  - Failed state renders retry + open-original buttons.
  - Partial state renders excerpt banner.
  - Truncation footer visible when `truncated === true`.
  - Resume pill appears when `reader_progress:<id>` localStorage > 5%.

### Acceptance criteria

- [ ] An arXiv PDF URL produces readable text in Reader Mode.
- [ ] A known Cloudflare-fronted blog that failed under the old UA now extracts.
- [ ] An extraction failure shows a Reader state with Retry + Open original, not a hidden button.
- [ ] Long essay (> 20k words) is no longer silently truncated without notice.
- [ ] Closing and reopening a bookmark resumes from the prior scroll position.

### Risks

- **Microlink rate limit (50/day).** Mitigation: only called as third fallback; personal-scale usage is well within bounds. If exceeded, we silently go to Partial state.
- **`pdfjs-dist` in Deno.** If incompatible, fall back to a lighter PDF extractor or defer PDF support to Phase 3.
- **Postlight add to bundle size.** It runs only in the edge function — no client bundle impact.

---

## Phase 3 — Value Unlock

**Status:** Planned
**Priority:** MEDIUM (Phase 2 shippable without it; this is where the "trusted curator" promise becomes real)
**Target version:** v3.12

### Why

Once the pipeline is trustworthy, the value of in-app reading compounds only if it does things the source URL can't:
1. Tell me whether this is worth reading *now* (summary).
2. Let me capture thinking as I read (highlights).
3. Make long video / podcast transcripts navigable.

All three feed Phase 2.4 ReflectionModal and 2.5 Spaced Review with higher-quality artifacts.

### What ships

#### 3A. AI Summary on save

- After `extract-content` succeeds, an AI summary is generated client-side using the existing OpenRouter wiring (`src/lib/ai.ts`). Free-model Llama 3.3 70B is sufficient. Stored on `content.summary` as a 2–3 sentence TL;DR.
- Rendered at the top of Reader Modal in a framed card with a "Summary" label and a small regeneration button.
- Rendered as a one-liner on `BookmarkCard` below the title — resolves the "is this worth opening" question before even opening the detail panel.
- Generation is fire-and-forget with Sentry breadcrumb on failure (consistent with existing metadata enrichment). No toast.
- Feature-gated on `openrouter_key` being present in localStorage; silently absent otherwise.

**Prompt sketch** (tune during implementation):
```
You are a brief. In 2–3 sentences (≤ 60 words total), tell the reader the single most useful takeaway of this article so they can decide whether to read it now. Avoid "the article discusses". Avoid preamble. Factual and direct.

Title: {title}
Content (first 3000 chars): {content.text.slice(0, 3000)}
```

#### 3B. Highlighting

- Select text in Reader Modal → floating toolbar appears with "Highlight" button.
- Saves a `note` of `type: 'highlight'` with:
  - `content`: selected text.
  - `bookmark_id`: current.
  - `meta.range`: `{ start_char_offset, end_char_offset, container_selector }` — so we can rehydrate on reopen.
- On render, `data-highlight-id` spans are painted around matched ranges with a yellow/warm background (sepia theme friendly).
- Highlight list is already shown in NotesTab — they slot in cleanly.
- Tap a highlight in NotesTab → scroll Reader to that position (if Reader is open) or open Reader at that position.

**Why this matters for Phase 2.5:** today, Review surfaces reflection notes. Highlights are additional artifacts. A Review card that shows "you highlighted: …" closes a loop that the article would otherwise leave open.

#### 3C. Auto TOC

- Parse `content.html` for `<h2>` / `<h3>` elements at render time.
- Render a collapsible TOC in the Reader header (mobile: expandable drawer; desktop: fixed sidebar on screens ≥ `xl`).
- Each entry scrolls to the heading with a 64 px offset for the sticky header.
- Highlights the current section based on scroll position (IntersectionObserver on headings).
- Hide TOC when fewer than 3 headings.

#### 3D. YouTube transcript UX

Currently the transcript is one wall of text. Improvements:
- **Paragraph by pause.** YouTube caption JSON includes timestamps. Split at pause gaps > 3 s or every ~120 words, whichever is closer.
- **Timestamp links.** Each paragraph starts with `[mm:ss]` that links to `youtu.be/<id>?t=<s>` — opens the source at that moment.
- **Chapters.** If the YouTube page has `chapters` in `ytInitialPlayerResponse`, render them as TOC entries (reuses 3C infrastructure).
- Stored as `content.html` (chunked `<p><a href="...">[mm:ss]</a> …</p>`) so Phase 1's renderer handles it for free.

#### 3E. Offline read cache

- For any bookmark in `reading` status, the service worker pre-caches `/api/v1/bookmark/:id/content` (new route stub) OR, more pragmatically, relies on the TanStack Query persistence plugin to cache `content.html` + `content.text` in IndexedDB for a subset of bookmarks (`reading` status only, to bound storage).
- Manual "Pin for offline" toggle in the detail panel for bookmarks not yet in `reading`.
- Status indicator in Reader header ("Offline-ready ✓" or "Network-only ⚠").

**Open question:** Query persistence plugin vs. bespoke SW cache. Evaluate at implementation time — query persistence is simpler and reuses existing cache infrastructure.

#### 3F. Typography polish

- Font size slider 12 px → 22 px in 1 px steps (replaces 3-step).
- Line-height options: `1.5 | 1.75 | 2.0` (a11y: 1.5 default, not current 1.8).
- Column width: `narrow (55ch) | comfortable (65ch) | wide (80ch)`.
- All persisted in `useReaderPrefs`.

### Files

**Edge function / client:**
- No new edge function for summary — OpenRouter client-side call already works.
- `src/lib/ai.ts` — add `summarizeArticle(title, text) → string | null`.
- `src/hooks/useBookmarks.ts` — add `autoSummarizeArticle()` in `autoFetchMetadataAndTag` chain, after extraction completes. Fire-and-forget with Sentry breadcrumb.
- `src/components/feed/BookmarkCard.tsx` — render `content.summary` as one-liner.
- `src/components/reader/ReaderModal.tsx` — summary card, TOC, typography controls expanded, highlight toolbar.
- `src/components/reader/HighlightToolbar.tsx` — new, floats on text selection.
- `src/components/reader/ReaderTOC.tsx` — new.
- `src/hooks/useReaderHighlights.ts` — new. Fetches `notes` filtered by `type === 'highlight'`, rehydrates ranges.
- `src/lib/youtube-transcript.ts` — new. Paragraph splitting + timestamp link rendering for YouTube.
- `supabase/functions/extract-content/index.ts` — YouTube path writes `content.html` (not just `content.text`) with chunked, timestamp-linked paragraphs.

**Types:**
- `src/types/index.ts`
  - `BookmarkContent` add `summary?: string`.
  - `Note.meta` add optional `range?: { start: number; end: number; selector: string }`.

### Tests

- `src/lib/__tests__/ai.test.ts` — `summarizeArticle` fixture tests + error handling.
- `src/lib/__tests__/youtube-transcript.test.ts` — paragraph splitting by pause, chapter detection, timestamp URL building.
- `src/hooks/__tests__/useReaderHighlights.test.ts` — highlight save + rehydrate roundtrip.
- `src/components/__tests__/ReaderModal.test.tsx` — summary render, TOC render, text selection triggers toolbar, highlight persists.

### Acceptance criteria

- [ ] New bookmarks get a summary within ~10 s of save (when `openrouter_key` present).
- [ ] Selecting text in Reader shows a Highlight button; tapping saves a `highlight` note.
- [ ] Reopening a bookmark with highlights shows them painted on the text.
- [ ] A 10k-word essay has a TOC in the Reader sidebar/drawer.
- [ ] A 2 h podcast transcript has chapters (if present), timestamp links per paragraph, and is skimmable.
- [ ] Typography slider persists between sessions.

### Risks

- **OpenRouter rate limits / bursts.** Debounced and queued per the Family 5 fix from the v3.0 bug-fix session. Summary is lower priority than tagging; fires last.
- **Highlight range stability.** Character offsets are fragile when the document changes. Mitigation: store both offsets AND the surrounding 40 chars of text; rehydration uses text-match first, offset as fallback.
- **Summary cost.** Free-tier Llama is free. If OpenRouter changes terms, gate behind an API-key-required flag; summary becomes opt-in.

---

## Rollout

Each phase ships independently. All land on `main` after passing the full pipeline (`format:check → lint → typecheck → test → build`) and 4-theme visual verification.

| Phase | Version | PR surface | Rollback |
|---|---|---|---|
| 1. Pipeline rebuild | v3.10 | Edge function change + client renderer swap + `@tailwindcss/typography` + DOMPurify | Revert PR. Old `content.text` still renders; no DB migration to roll back. |
| 2. Reliability | v3.11 | Edge function fallback chain + retry + PDF + client UI states + progress persistence | Revert PR. `content_status === 'partial'` rows degrade cleanly to "no content" in pre-Phase-2 client. |
| 3. Value unlock | v3.12 | AI summary + highlights + TOC + YouTube + typography | Revert PR per sub-feature (A–F are separable). |

**Flag strategy:** None. Each phase is small enough that flags are overhead. Revert if anything breaks.

**Backfill policy:** Lazy. No mass re-extraction job. A bookmark gets `content.html` / `content.summary` / better YouTube transcript the next time it's opened or refreshed. Users with high-value old bookmarks can hit the existing "Refresh metadata" button.

---

## Success criteria (platform-level)

The overhaul is successful when:

1. **User testimony:** Aditya opens Reader Mode for a saved article and doesn't switch to the browser tab.
2. **Reflection loop completion rate rises.** Phase 2.4 ReflectionModal fires more often, because mark-done now happens in-app instead of in the browser.
3. **Extraction failure rate drops below 10%** (measured by `content_status === 'failed'` over `content_status IN ('success', 'failed')`). Baseline: unknown — add a telemetry query to `useStats`-adjacent code during Phase 2.
4. **Zero extraction regressions** reported in `docs/user-feedback.md` for 30 days post-Phase 3.
5. **`src/lib/reader.ts` is deleted.** Heuristic parsing is gone. The reader path is: `content.html → DOMPurify → prose render`.

---

## Appendix A — Audit summary (2026-04-17)

### Pipeline (edge function)
- `supabase/functions/extract-content/index.ts:245-270` — `article.content` (rich HTML) is touched only by a regex for lead image, then discarded. `article.textContent` is stored as `content.text`.
- No fallback chain. No retry. `User-Agent: ContentDeck/1.0` is bot-flagged by CDNs.
- 100 KB silent truncation. No PDF path. No CDN cache.
- v3.9.3 correctly fixed 200-on-failure → 500; the UX layer still doesn't surface the failure.

### Parser (client)
- `src/lib/reader.ts:22-108` — heuristic heading/list/paragraph detection on plain text.
- `looksLikeHeading`: ≤ 90 chars, ≤ 10 words, no trailing `.,;!` → heading. Promotes captions. Demotes real headings with periods.
- List detector needs ≥ 2 marker-prefixed lines; nested lists collapse.
- Fragile and unnecessary — HTML already has the structure.

### Promised features never shipped (per `phase-1.md §1.5`)
- Inline highlighting → `highlight` note.
- Reading progress persistence (scroll % per bookmark).
- Offline reading (SW cache of extracted content).
- Summaries.
- PDF support (implicit — "blog/substack/linkedin" only).

### Reading UX gaps
- Font size: 3 steps only (sm/md/lg). No line-height, column-width, or TOC.
- No swipe-to-next bookmark.
- Scroll position resets on every reopen.
- `history.pushState` works (v3.0 PWA back fix) but otherwise no session continuity.

### YouTube transcripts
- One ~100 KB text blob with no timestamps, paragraph breaks, or speaker cues. 2 h podcast transcript is unreadable.

### Performance
- `queryClient.invalidateQueries({ queryKey: QUERY_KEY })` on every successful extraction refetches all bookmarks. Should be a targeted `setQueryData` merge.
- `parseContentBlocks()` runs on every render — not memoized.
- No Edge CDN caching keyed by URL hash; re-extraction hits source every time.

### Dependency state
- `DOMPurify` — not installed (planned in `infrastructure.md` row 93, never added).
- `@tailwindcss/typography` — not installed.
- `@postlight/parser`, `pdfjs-dist` — not installed.

---

## Appendix B — Open questions (resolve during Phase 1 kickoff)

1. **Deno-compatible sanitizer.** `isomorphic-dompurify` is the expected choice but verify it loads cleanly in the edge function. Backup: a hand-rolled allow-list sanitizer using `linkedom` (already used).
2. **External image policy.** Do we allow `img[src]` from any origin, or restrict to `https:`? v1: allow any `https:`, block `http:` / `data:`. Revisit if CSP escalates.
3. **Highlight rehydration anchor.** Character offset vs. CSS selector vs. text-match. Decide based on how stable DOMPurify output is across runs (likely stable; character offset should work).
4. **Reader route.** Today Reader is a modal. Consider a dedicated `/read/:id` route so iOS shortcut / PWA Share can deep-link into Reader for a given bookmark. Defer unless there's a specific trigger.
5. **Print styles.** A `@media print` sheet would be trivial to add and useful for "export this article as PDF via browser print". Defer to Phase 3F polish.

---

## Appendix C — Things explicitly out of scope

- Cross-device reading-progress sync (deferred to v4.0 Intelligence Layer).
- Multi-column layouts / two-page book view.
- Text-to-speech (browser TTS exists; not our job for v1).
- Translation.
- Social sharing / public reading lists — contradicts `philosophy.md §What ContentDeck Must Never Become`.
- Proxied images / self-hosted image CDN.
- Reader analytics (time-on-page, scroll heat maps) — contradicts "retreat" metaphor.

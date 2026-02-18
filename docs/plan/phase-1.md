# Phase 1: Foundation (v3.0) — Active Items

> Goal: Real users, real data, real reliability. The "production-grade" release.

**Completed:** 1.1 Supabase Auth, 1.1a Bookmarklet, 1.1b iOS Shortcut, 1.2a Metadata fix, 1.2b Content extraction, Areas & tagging redesign, 1.3 Full-text search, 1.5 Reader mode, 1.6 Testing & CI — see `docs/log/`

---

## 1.2 Content Extraction Pipeline
**Why**: Enables full-text search, summaries, reader mode, and offline reading.

- **Supabase Edge Function**: `extract-content`
  - Input: URL
  - Uses Mozilla Readability (npm package, runs in Deno)
  - Extracts: title, author, text content, word count, reading time, lead image
  - Stores in new `content` JSONB column on bookmarks
  - Triggered on bookmark insert (database webhook → edge function)
- **Fallback chain**: Readability → Microlink → title-only
- **Rate limiting**: Process max 10 URLs/minute per user (pg_cron queue)

## 1.3 Full-Text Search
**Why**: Searching bookmark titles is limiting. Users want to search *what they read*.

- PostgreSQL `tsvector` column on bookmarks (title + extracted content)
- `GIN` index for fast full-text queries
- Supabase `.textSearch()` in existing `useBookmarks` hook
- Search UI: results highlight matching terms
- Zero additional cost (PostgreSQL built-in)

```sql
ALTER TABLE bookmarks ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content->>'text', '')), 'B')
  ) STORED;

CREATE INDEX bookmarks_search_idx ON bookmarks USING GIN (search_vector);
```

## 1.4 Import System
**Why**: Nobody switches tools without their existing data.

- **Pocket**: Export HTML → parse `<li>` tags → bulk insert
- **Instapaper**: CSV export → parse → bulk insert
- **Raindrop.io**: CSV/HTML export → parse → bulk insert
- **Browser bookmarks**: Chrome/Firefox HTML export → parse
- **Generic CSV**: Column mapping UI for any bookmark manager
- **Implementation**: Client-side parser + batch `addBookmark` mutations
- **Progress UI**: Reuse existing `ProgressBar` component

## 1.5 Reader Mode
**Why**: The gap between "saving" and "reading" is leaving the app.

- Extracted content (from 1.2) rendered in a clean, distraction-free view
- Typography: configurable font size, serif/sans-serif, line height
- Dark/light/sepia themes
- Inline highlighting: select text → save as `highlight` note
- Reading progress tracking (scroll position saved per bookmark)
- Estimated reading time with live "X min remaining"

## 1.6 Testing & CI
**Why**: Moving fast without breaking things requires automated verification.

- **Vitest**: Unit tests for lib/ functions and hooks (utils, metadata, ai, useBookmarks) ✅ **DONE** — 62 tests across 4 files
- **React Testing Library**: Component tests for critical UI flows ✅ **DONE** — 33 tests across 5 files (App, AuthScreen, AddBookmarkModal, BookmarkCard, StatusFilters)
- **Playwright**: E2E tests — **DEFERRED** (overkill for personal app with strong unit + component coverage)
- **GitHub Actions**: CI pipeline on PRs and pushes to main ✅ **DONE** — format → lint → typecheck → test → build
- **Type checking**: `tsc --noEmit` in CI ✅ **DONE** (included in GitHub Actions pipeline)

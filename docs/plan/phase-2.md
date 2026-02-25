# Phase 2: Intelligence (v3.5)

> Goal: AI that actively helps you learn, not just tag.

---

## Pre-Phase 2 — Cleanup & Expansion (v3.2)

These items must ship **before** the AI features. They are bounded, high-ROI, and keep the codebase clean and well-tested going into the more complex AI work. Tracked via session plan in `docs/user-feedback.md`.

### 2.0.1 Source Type Expansion (Session 3)

**GitHub repositories** — detect `github.com/*/*` URLs:
- Fetch repo metadata via GitHub public API (no key needed): name, description, stars, language, topics
- DB trigger: add `github.com` to `detect_source_type()` regex
- Display: star count + language badge in card metadata

**arXiv papers** — detect `arxiv.org/abs/` and `arxiv.org/pdf/` URLs:
- Fetch title, authors, abstract via arXiv API (free, no key)
- Reader mode: show abstract + link to PDF
- DB trigger: add `arxiv.org` to `detect_source_type()` regex

### 2.0.2 Obsidian Wikilinks (Session 3)

- Currently exports `tags: ["tag1", "tag2"]` as plain strings in YAML frontmatter
- Desired: `[[tag1]]` wikilink format so Obsidian backlink graph picks up tag connections
- Options: always use `[[tag]]` in YAML, or add a toggle in Settings
- File: `src/lib/obsidian.ts`

### 2.0.3 Race Condition & Metadata Test Coverage (Session 4)

Current tests mock `fetchMetadata` entirely — real failure modes and races are invisible.

- Test: `triggerExtraction` → `invalidateQueries` does not fire before DB writes complete
- Test: areas are preserved in cache after `autoFetchMetadataAndTag` completes (no stale-spread clobber)
- Test: `enrichAndTag` startup batch `await`s DB writes before calling `invalidateQueries`
- Test: silent `catch {}` blocks surface `console.warn` in development
- Files: `src/hooks/__tests__/useBookmarks.test.ts`, new `src/lib/__tests__/metadata.test.ts` extensions

### 2.0.4 Feedback System Enhancements (post-Session 3/4)

In-app feedback capture was shipped (v3.1, #20). These enhancements were explicitly deferred:

- **html2canvas screenshots** — capture a screenshot at the moment the feedback modal opens; store in Supabase Storage; display as thumbnail in FeedbackList
- ~~**GitHub Issues sync**~~ — **SHIPPED v3.2** (#22): `create-github-issue` edge function, badge in FeedbackList, `github_issue_number`/`github_issue_url` columns on feedback table
- **Frequency deduplication** — "Same as #N" button per feedback item; increment repeat counter; sort FeedbackList by frequency × recency in addition to date
- **Feedback analytics** — weekly counts by type/severity surfaced in the Stats modal; trend sparkline

### 2.0.5 Sentry Error Tracking — SHIPPED v3.2 (#21)

Unplanned but executed in the same session as GitHub Issues sync. Zero-config after DSN is set:

- ~~`@sentry/react` init in `main.tsx` (no-op when `VITE_SENTRY_DSN` absent)~~ ✅
- ~~`captureException` in `ErrorBoundary.componentDidCatch`~~ ✅
- ~~Source maps via `@sentry/vite-plugin` + `build.sourcemap: true`~~ ✅
- ~~`VITE_SENTRY_DSN` plumbed through Vercel + GitHub CI secrets~~ ✅

---

## 2.1 AI Summarization

- **One-click summarize** in detail panel
- Edge function: send extracted text to OpenRouter → get 3-5 bullet summary
- Store in `metadata.summary` (JSONB)
- Show summary card above notes in detail panel
- **Progressive**: Short summary on card, full summary in detail
- **Model**: Gemma 3 or Llama 3.3 70B (free on OpenRouter)

## 2.2 Smart Connections

- When viewing a bookmark, show "Related" bookmarks
- Algorithm: TF-IDF on extracted text + shared tags + same source type
- Computed via edge function, cached in `metadata.related_ids`
- UI: "Related" section at bottom of detail panel
- No external API — pure PostgreSQL full-text ranking

## 2.3 Reading Queue Prioritization

- **Smart queue**: AI suggests what to read next based on:
  - Time in queue (older unread items bubble up)
  - Topic diversity (don't read 5 React articles in a row)
  - Reading history (prefer sources you finish, deprioritize sources you abandon)
  - Freshness (time-sensitive content like news ranked higher)
- Displayed as a "Up Next" card at the top of the feed
- Uses existing `status_history` data — no new tables needed

## 2.4 Auto-Collections

- AI groups related bookmarks into suggested collections
- "You've saved 8 articles about system design — create a collection?"
- One-click accept → creates a tag area with pre-assigned bookmarks
- Runs weekly via pg_cron → edge function → OpenRouter

## 2.5 Chat with Your Library

- "What did I save about React Server Components?"
- "Summarize my top 5 insights from this month"
- "What topics am I reading most about?"
- Implementation: RAG over extracted content using pgvector (free in Supabase)
- Embeddings: generated via edge function on content extraction
- Chat UI: slide-out panel, conversation history

```sql
-- pgvector extension (free in Supabase)
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE bookmarks ADD COLUMN embedding vector(384);
CREATE INDEX bookmarks_embedding_idx ON bookmarks USING ivfflat (embedding vector_cosine_ops);
```

## 2.6 Spaced Review

- Bookmarks marked "done" enter a review queue
- Spaced repetition algorithm (SM-2 variant) schedules reviews
- Daily "Review" card: shows 3-5 bookmarks with your notes
- "Still remember?" → push to next interval
- "Forgot" → resurface sooner
- Goal: turn passive reading into retained knowledge

---

## Backlog (P3 — schedule after Phase 2 core)

These were reported and triaged but are low-priority relative to the AI features:

| Item | Description |
|---|---|
| YouTube transcript extraction | Fetch via youtube-transcript or similar; surface in Reader mode |
| Warm/Sepia theme (main app) | Reader mode already has sepia; extend to the dashboard shell |

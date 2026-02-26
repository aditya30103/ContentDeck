# Phase 2: Intelligence (v3.5)

> Goal: AI that actively helps you learn, not just tag.

---

## Shipped (Pre-Phase 2 Cleanup)

| Item | Version | PR |
|---|---|---|
| GitHub Issues sync — `create-github-issue` edge function, badge in FeedbackList | v3.2 | #23 |
| Sentry error tracking — `@sentry/react` init, ErrorBoundary, source maps, CI secret | v3.2 | #23 |
| Full Sentry coverage — all 14 mutations, unhandledrejection, fire-and-forget chains | v3.2 | #26 |
| Obsidian Wikilinks — `[[tag]]` format in YAML frontmatter for backlink graph | v3.3 | #28 |
| Extended Themes — Sepia + Navy themes, 4-button picker in Settings | v3.3 | #29 |
| Race Condition & Metadata Tests — areas preserved, invoke ordering, console.warn in DEV | v3.3 | #30 |
| arXiv source type — API metadata (title/authors/abstract), content.text, SQL migration | v3.3 | #31 |
| YouTube transcript extraction — caption scraping in `extract-content` edge function | v3.3 | #32 |

---

## Pre-Phase 2 Backlog (Deferred)

### 2.0.1 Source Type Expansion — GitHub repositories (deferred)

**GitHub repositories** — detect `github.com/*/*` URLs:
- Fetch repo metadata via GitHub public API (no key needed): name, description, stars, language, topics
- DB trigger: add `github.com` to `detect_source_type()` regex
- Display: star count + language badge in card metadata

> arXiv papers shipped in v3.3 (#31). GitHub repos deferred — lower ROI before Phase 2 AI work.

### 2.0.4 Feedback System Enhancements (deferred)

Remaining items from the feedback system (in-app capture shipped v3.1, GitHub sync shipped v3.2):

- **html2canvas screenshots** — capture a screenshot at the moment the feedback modal opens; store in Supabase Storage; display as thumbnail in FeedbackList
- **Frequency deduplication** — "Same as #N" button per feedback item; increment repeat counter; sort FeedbackList by frequency × recency
- **Feedback analytics** — weekly counts by type/severity in the Stats modal; trend sparkline

---

## Phase 2 — AI Features

### 2.1 AI Summarization

- **One-click summarize** in detail panel
- Edge function: send extracted text to OpenRouter → get 3-5 bullet summary
- Store in `metadata.summary` (JSONB)
- Summary card shown above notes in detail panel
- **Progressive**: short summary on card, full summary in detail
- **Model**: Gemma 3 or Llama 3.3 70B (free on OpenRouter)

### 2.2 Smart Connections

- When viewing a bookmark, show "Related" bookmarks
- Algorithm: TF-IDF on extracted text + shared tags + same source type
- Computed via edge function, cached in `metadata.related_ids`
- UI: "Related" section at bottom of detail panel
- No external API — pure PostgreSQL full-text ranking

### 2.3 Reading Queue Prioritization

- **Smart queue**: AI suggests what to read next based on:
  - Time in queue (older unread items bubble up)
  - Topic diversity (don't read 5 React articles in a row)
  - Reading history (prefer sources you finish, deprioritize sources you abandon)
  - Freshness (time-sensitive content like news ranked higher)
- Displayed as an "Up Next" card at the top of the feed
- Uses existing `status_history` data — no new tables needed

### 2.4 Auto-Collections

- AI groups related bookmarks into suggested collections
- "You've saved 8 articles about system design — create a collection?"
- One-click accept → creates a tag area with pre-assigned bookmarks
- Runs weekly via pg_cron → edge function → OpenRouter

### 2.5 Chat with Your Library

- "What did I save about React Server Components?"
- "Summarize my top 5 insights from this month"
- "What topics am I reading most about?"
- Implementation: RAG over extracted content using pgvector (free in Supabase)
- Embeddings generated via edge function on content extraction
- Chat UI: slide-out panel with conversation history

```sql
-- pgvector extension (free in Supabase)
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE bookmarks ADD COLUMN embedding vector(384);
CREATE INDEX bookmarks_embedding_idx ON bookmarks USING ivfflat (embedding vector_cosine_ops);
```

### 2.6 Spaced Review

- Bookmarks marked "done" enter a review queue
- Spaced repetition algorithm (SM-2 variant) schedules reviews
- Daily "Review" card: shows 3-5 bookmarks with your notes
- "Still remember?" → push to next interval; "Forgot" → resurface sooner
- Goal: turn passive reading into retained knowledge

---

## Backlog (P3 — after Phase 2 core)

| Item | Status | Description |
|---|---|---|
| YouTube transcript extraction | ✅ Shipped v3.3 (#32) | Caption scraping via `ytInitialPlayerResponse`, JSON3 format, stored in `content.text` |
| Warm/Sepia theme + Navy theme | ✅ Shipped v3.3 (#29) | CSS variable overrides, 4-button picker in Settings (Light/Dark/Sepia/Navy) |

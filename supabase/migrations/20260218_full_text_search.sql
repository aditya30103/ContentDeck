-- Migration: Add full-text search vector to bookmarks
-- Weights: title (A) > excerpt (B) > content body (C)
-- Auto-updates via GENERATED ALWAYS AS STORED on every row change

ALTER TABLE bookmarks
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(content->>'text', '')), 'C')
    ) STORED;

CREATE INDEX IF NOT EXISTS bookmarks_search_idx ON bookmarks USING GIN (search_vector);

-- Migration 005: Add content extraction columns to bookmarks
-- Run in Supabase SQL Editor

-- Content extraction data (full article text, author, word count, etc.)
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS content jsonb DEFAULT '{}'::jsonb;

-- Extraction pipeline status
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS content_status text DEFAULT 'pending'
  CHECK (content_status IN ('pending', 'extracting', 'success', 'failed', 'skipped'));

-- When content was last extracted
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS content_fetched_at timestamptz;

-- Partial index for efficient pending/failed queries
CREATE INDEX IF NOT EXISTS idx_bookmarks_content_status
  ON bookmarks (content_status)
  WHERE content_status IN ('pending', 'failed');

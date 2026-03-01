-- Phase 2.5 prep: spaced review tracking
ALTER TABLE bookmarks ADD COLUMN IF NOT EXISTS last_reviewed_at timestamptz;

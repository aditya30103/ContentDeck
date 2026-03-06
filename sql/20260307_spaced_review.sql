-- Migration: 20260307_spaced_review.sql
-- Adds last_reviewed_at column for SM-2 spaced review tracking.
-- Review interval and repetitions are stored in metadata JSONB (no new columns needed).

ALTER TABLE bookmarks ADD COLUMN last_reviewed_at timestamptz;

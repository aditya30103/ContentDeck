-- Add GitHub issue tracking columns to feedback table
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS github_issue_number INTEGER;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS github_issue_url    TEXT;

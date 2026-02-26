-- Migration: Add arxiv as a first-class source type
-- Run in Supabase SQL Editor

-- Update detect_source_type() trigger to recognise arXiv URLs
CREATE OR REPLACE FUNCTION detect_source_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source_type IS NULL OR NEW.source_type = 'auto' THEN
    IF NEW.url ~* 'youtube\.com|youtu\.be|youtube\.app\.goo\.gl' THEN
      NEW.source_type := 'youtube';
    ELSIF NEW.url ~* 'twitter\.com|x\.com|t\.co' THEN
      NEW.source_type := 'twitter';
    ELSIF NEW.url ~* 'linkedin\.com|lnkd\.in' THEN
      NEW.source_type := 'linkedin';
    ELSIF NEW.url ~* 'substack\.com' THEN
      NEW.source_type := 'substack';
    ELSIF NEW.url ~* 'arxiv\.org/(abs|pdf)/' THEN
      NEW.source_type := 'arxiv';
    ELSE
      NEW.source_type := 'blog';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update insert_bookmark_via_token() RPC to also detect arXiv
CREATE OR REPLACE FUNCTION insert_bookmark_via_token(
  p_user_id uuid,
  p_url text,
  p_title text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
  v_source_type text := 'blog';
BEGIN
  IF p_url ~* 'youtube\.com|youtu\.be|youtube\.app\.goo\.gl' THEN
    v_source_type := 'youtube';
  ELSIF p_url ~* 'twitter\.com|x\.com|t\.co' THEN
    v_source_type := 'twitter';
  ELSIF p_url ~* 'linkedin\.com|lnkd\.in' THEN
    v_source_type := 'linkedin';
  ELSIF p_url ~* 'substack\.com' THEN
    v_source_type := 'substack';
  ELSIF p_url ~* 'arxiv\.org/(abs|pdf)/' THEN
    v_source_type := 'arxiv';
  END IF;

  INSERT INTO bookmarks (user_id, url, title, source_type, status, is_favorited, notes, tags, metadata, synced)
  VALUES (p_user_id, p_url, p_title, v_source_type, 'unread', false, '[]'::jsonb, '{}', '{}'::jsonb, false)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

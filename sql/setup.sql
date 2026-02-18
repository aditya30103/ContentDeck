-- ContentDeck v3.0 Database Schema
-- Run this in Supabase SQL Editor for a fresh setup
-- Requires: Supabase Auth enabled with at least one provider

-- Bookmarks table
create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  url text not null,
  title text,
  image text,
  excerpt text,
  source_type text default 'auto',
  status text default 'unread' check (status in ('unread', 'reading', 'done')),
  is_favorited boolean default false,
  notes jsonb default '[]'::jsonb,
  tags text[] default '{}',
  metadata jsonb default '{}'::jsonb,
  content jsonb default '{}'::jsonb,
  content_status text default 'pending' check (content_status in ('pending', 'extracting', 'success', 'failed', 'skipped')),
  content_fetched_at timestamptz,
  synced boolean default false,
  created_at timestamptz default now(),
  status_changed_at timestamptz default now(),
  started_reading_at timestamptz,
  finished_at timestamptz
);

create index idx_bookmarks_source on bookmarks(source_type);
create index idx_bookmarks_status on bookmarks(status);
create index idx_bookmarks_created on bookmarks(created_at desc);
create index idx_bookmarks_user on bookmarks(user_id);
create index idx_bookmarks_content_status on bookmarks(content_status) where content_status in ('pending', 'failed');

-- Full-text search vector (title A > excerpt B > content body C)
alter table bookmarks
  add column if not exists search_vector tsvector
    generated always as (
      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(content->>'text', '')), 'C')
    ) stored;

create index bookmarks_search_idx on bookmarks using gin (search_vector);

-- Tag areas
create table tag_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text not null,
  description text,
  color text,
  emoji text,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index idx_tag_areas_user on tag_areas(user_id);

-- Junction table
create table bookmark_tags (
  bookmark_id uuid references bookmarks(id) on delete cascade,
  tag_area_id uuid references tag_areas(id) on delete cascade,
  primary key (bookmark_id, tag_area_id)
);

-- User API tokens (for bookmarklet/iOS Shortcut via edge function)
create table user_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null default 'Default',
  token_hash text not null,
  created_at timestamptz default now(),
  last_used_at timestamptz
);

create index idx_user_tokens_hash on user_tokens(token_hash);

-- Status history (for streaks/stats)
create table status_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  bookmark_id uuid references bookmarks(id) on delete cascade,
  old_status text,
  new_status text,
  changed_at timestamptz default now()
);

create index idx_status_history_user on status_history(user_id);

-- Auto-detect source type trigger (case-insensitive)
create or replace function detect_source_type()
returns trigger as $$
begin
  if NEW.source_type is null or NEW.source_type = 'auto' then
    if NEW.url ~* 'youtube\.com|youtu\.be|youtube\.app\.goo\.gl' then
      NEW.source_type := 'youtube';
    elsif NEW.url ~* 'twitter\.com|x\.com|t\.co' then
      NEW.source_type := 'twitter';
    elsif NEW.url ~* 'linkedin\.com|lnkd\.in' then
      NEW.source_type := 'linkedin';
    elsif NEW.url ~* 'substack\.com' then
      NEW.source_type := 'substack';
    else
      NEW.source_type := 'blog';
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger auto_detect_source
  before insert on bookmarks
  for each row execute function detect_source_type();

-- Status history trigger
create or replace function track_status_change()
returns trigger as $$
begin
  if OLD.status is distinct from NEW.status then
    insert into status_history (bookmark_id, user_id, old_status, new_status)
    values (NEW.id, NEW.user_id, OLD.status, NEW.status);
    NEW.status_changed_at := now();
    if NEW.status = 'reading' and OLD.status = 'unread' then
      NEW.started_reading_at := now();
    end if;
    if NEW.status = 'done' and OLD.status != 'done' then
      NEW.finished_at := now();
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger on_status_change
  before update on bookmarks
  for each row execute function track_status_change();

-- Auto-set user_id on insert (COALESCE preserves explicit user_id from edge functions)
create or replace function set_user_id()
returns trigger as $$
begin
  NEW.user_id := coalesce(NEW.user_id, auth.uid());
  return NEW;
end;
$$ language plpgsql security definer;

create trigger set_bookmark_user
  before insert on bookmarks
  for each row execute function set_user_id();
create trigger set_tag_area_user
  before insert on tag_areas
  for each row execute function set_user_id();
create trigger set_status_history_user
  before insert on status_history
  for each row execute function set_user_id();
create trigger set_user_token_user
  before insert on user_tokens
  for each row execute function set_user_id();

-- RPC for external bookmark insert (bypasses set_user_id trigger)
-- Used by save-bookmark edge function where auth.uid() is null
create or replace function insert_bookmark_via_token(
  p_user_id uuid,
  p_url text,
  p_title text default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
  v_source_type text := 'blog';
begin
  if p_url ~* 'youtube\.com|youtu\.be|youtube\.app\.goo\.gl' then
    v_source_type := 'youtube';
  elsif p_url ~* 'twitter\.com|x\.com|t\.co' then
    v_source_type := 'twitter';
  elsif p_url ~* 'linkedin\.com|lnkd\.in' then
    v_source_type := 'linkedin';
  elsif p_url ~* 'substack\.com' then
    v_source_type := 'substack';
  end if;

  insert into bookmarks (user_id, url, title, source_type, status, is_favorited, notes, tags, metadata, synced)
  values (p_user_id, p_url, p_title, v_source_type, 'unread', false, '[]'::jsonb, '{}', '{}'::jsonb, false)
  returning id into v_id;

  return v_id;
end;
$$;

-- RLS (user-scoped access)
alter table bookmarks enable row level security;
create policy "Users see own bookmarks" on bookmarks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table tag_areas enable row level security;
create policy "Users see own tag areas" on tag_areas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table bookmark_tags enable row level security;
create policy "Users see own bookmark tags" on bookmark_tags
  for all using (bookmark_id in (select id from bookmarks where user_id = auth.uid()))
  with check (bookmark_id in (select id from bookmarks where user_id = auth.uid()));

alter table status_history enable row level security;
create policy "Users see own status history" on status_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table user_tokens enable row level security;
create policy "Users manage own tokens" on user_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

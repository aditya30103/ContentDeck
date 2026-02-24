-- Feedback table for in-app bug reports and suggestions
-- Run this in the Supabase SQL Editor after setup.sql

create table if not exists feedback (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  feedback_type       text not null check (feedback_type in ('bug', 'suggestion', 'other')),
  title               text not null,
  description         text,
  severity            text check (severity in ('blocking', 'major', 'minor', 'polish')) default 'minor',
  app_context         jsonb not null default '{}'::jsonb,
  system_context      jsonb not null default '{}'::jsonb,
  active_bookmark_id  uuid references bookmarks(id) on delete set null,
  status              text not null default 'open'
                        check (status in ('open', 'investigating', 'resolved', 'wont_fix')),
  resolution_note     text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists idx_feedback_user    on feedback(user_id);
create index if not exists idx_feedback_status  on feedback(status);
create index if not exists idx_feedback_created on feedback(created_at desc);

create or replace function touch_feedback_updated_at()
returns trigger as $$
begin NEW.updated_at := now(); return NEW; end;
$$ language plpgsql;

create trigger feedback_updated_at
  before update on feedback
  for each row execute function touch_feedback_updated_at();

-- Reuse existing set_user_id() trigger (already defined in setup.sql)
create trigger set_feedback_user
  before insert on feedback
  for each row execute function set_user_id();

alter table feedback enable row level security;
create policy "users_own_feedback" on feedback
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

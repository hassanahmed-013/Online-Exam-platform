-- =============================================================
-- MDCAT Prep Platform — Supabase / Postgres schema
-- Run this in the Supabase SQL editor for your project.
-- Mirrors the schema in docs/project-scope.md (section 4).
-- =============================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Profiles (extends auth.users) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role text not null default 'student',        -- 'student' | 'admin'
  current_plan text not null default 'free',   -- cached from subscriptions
  plan_expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Subscriptions ----------
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  plan text not null,        -- 'monthly' | 'annual' | 'lifetime'
  status text not null,      -- 'active' | 'expired' | 'cancelled'
  starts_at timestamptz,
  ends_at timestamptz,
  payment_ref text,
  created_at timestamptz not null default now()
);

-- ---------- Exams ----------
create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  cover_image_url text,
  is_published boolean not null default true
);

-- ---------- Categories ----------
-- Admin-defined, free-form hierarchy: parent_id null = a top-level subject,
-- otherwise a sub-topic nested under one. Each carries its own card content.
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references exams(id) on delete cascade,
  parent_id uuid references categories(id) on delete set null,
  slug text not null,
  name text not null,
  short_description text,
  cover_image_url text,               -- category-images bucket URL (or data URI)
  sort_order int not null default 0
);
create unique index if not exists categories_exam_slug_idx
  on categories (exam_id, slug);

-- ---------- Questions ----------
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references exams(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  stem text not null,
  explanation text,
  difficulty text default 'medium',  -- effective: 'easy' | 'medium' | 'hard'
  difficulty_override text,          -- admin-forced value; null = use computed
  correct_rate numeric,              -- cached correct-answer rate (0-1)
  attempts_sample_size int not null default 0, -- attempts the rate is based on
  image_url text,                    -- question-images bucket URL (or data URI)
  image_source text,                 -- 'manual_upload' | 'bulk_import'
  original_source_url text,          -- provenance for bulk-imported images
  is_demo boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  sort_order int
);

-- ---------- Mock exams ----------
create table if not exists mock_exams (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references exams(id) on delete cascade,
  name text not null,
  question_count int,
  duration_minutes int
);

create table if not exists mock_exam_questions (
  mock_exam_id uuid references mock_exams(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  sort_order int,
  primary key (mock_exam_id, question_id)
);

-- ---------- Attempts ----------
create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  guest_token text,
  exam_id uuid references exams(id) on delete set null,
  mode text not null,        -- 'practice' | 'timed' | 'mock'
  mock_exam_id uuid references mock_exams(id),
  category_ids uuid[],
  status text not null default 'in_progress', -- 'in_progress' | 'completed' | 'abandoned'
  current_question_index int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  score_percent numeric
);

create table if not exists attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references attempts(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  selected_option_id uuid references question_options(id),
  is_correct boolean,
  flagged boolean not null default false,
  answered_at timestamptz not null default now()
);

-- ---------- Reviews (difficulty votes / remove) ----------
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  vote text,                 -- 'up' | 'down'
  removed boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Demo sessions (guest, auto-expiring) ----------
create table if not exists demo_sessions (
  token text primary key,
  question_ids uuid[],
  expires_at timestamptz not null
);

-- =============================================================
-- Row Level Security
-- =============================================================
alter table profiles        enable row level security;
alter table subscriptions   enable row level security;
alter table attempts        enable row level security;
alter table attempt_answers enable row level security;
alter table reviews         enable row level security;
alter table questions       enable row level security;
alter table question_options enable row level security;
alter table exams           enable row level security;
alter table categories      enable row level security;
alter table mock_exams      enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Profiles: user sees/edits own row; admin sees all.
create policy "profiles_select_own" on profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid() or public.is_admin());

-- Subscriptions: owner reads own; admin manages all.
create policy "subs_select_own" on subscriptions
  for select using (user_id = auth.uid() or public.is_admin());
create policy "subs_admin_all" on subscriptions
  for all using (public.is_admin()) with check (public.is_admin());

-- Content (read-only for everyone signed in; admin full CRUD).
create policy "content_read_exams" on exams for select using (true);
create policy "content_read_categories" on categories for select using (true);
create policy "content_read_questions" on questions for select using (true);
create policy "content_read_options" on question_options for select using (true);
create policy "content_read_mocks" on mock_exams for select using (true);

create policy "admin_write_exams" on exams for all using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_categories" on categories for all using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_questions" on questions for all using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_options" on question_options for all using (public.is_admin()) with check (public.is_admin());
create policy "admin_write_mocks" on mock_exams for all using (public.is_admin()) with check (public.is_admin());

-- Attempts / answers: visible only to their owner (or admin).
create policy "attempts_own" on attempts
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
create policy "answers_own" on attempt_answers
  for all using (
    exists (select 1 from attempts a where a.id = attempt_id and (a.user_id = auth.uid() or public.is_admin()))
  )
  with check (
    exists (select 1 from attempts a where a.id = attempt_id and (a.user_id = auth.uid() or public.is_admin()))
  );

-- Reviews: owner only.
create policy "reviews_own" on reviews
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =============================================================
-- Trigger: create a profile row on new auth user
-- =============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================================
-- Storage buckets (question images + category covers + textbooks)
-- =============================================================
-- Public read so students/visitors can view images; writes are admin-only.
insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true),
       ('category-images', 'category-images', true),
       ('textbooks', 'textbooks', true)
on conflict (id) do nothing;

-- Public read for media buckets.
drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select using (bucket_id in ('question-images', 'category-images', 'textbooks'));

-- Admin-only insert/update/delete for media buckets.
drop policy if exists "media_admin_write" on storage.objects;
create policy "media_admin_write" on storage.objects
  for all
  using (bucket_id in ('question-images', 'category-images', 'textbooks') and public.is_admin())
  with check (bucket_id in ('question-images', 'category-images', 'textbooks') and public.is_admin());

-- =============================================================
-- Textbooks / study documents
-- =============================================================
create table if not exists textbooks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  tag text not null default 'High-yield',
  file_url text not null,
  file_name text not null,
  file_type text not null default 'application/pdf',
  file_size int not null default 0,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table textbooks enable row level security;

drop policy if exists "textbooks_public_read" on textbooks;
create policy "textbooks_public_read" on textbooks
  for select using (is_active or public.is_admin());

drop policy if exists "textbooks_admin_write" on textbooks;
create policy "textbooks_admin_write" on textbooks
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================
-- Automatic difficulty classification
-- =============================================================
-- Recompute each question's correct-answer rate from attempt_answers and bucket
-- it into easy/medium/hard. Precedence: admin override → computed value (once a
-- question has enough attempts) → whatever difficulty is already stored. Keep
-- the thresholds in sync with src/lib/difficulty.ts.
create or replace function public.recalculate_question_difficulty()
returns void language sql as $$
  update questions q
  set
    attempts_sample_size = sub.total,
    correct_rate = sub.correct::numeric / sub.total,
    difficulty = case
      when q.difficulty_override is not null then q.difficulty_override
      when sub.total < 20 then coalesce(q.difficulty, 'medium')  -- min sample
      when sub.correct::numeric / sub.total >= 0.75 then 'easy'
      when sub.correct::numeric / sub.total >= 0.40 then 'medium'
      else 'hard'
    end
  from (
    select question_id,
           count(*) as total,
           count(*) filter (where is_correct) as correct
    from attempt_answers
    group by question_id
  ) sub
  where q.id = sub.question_id;
$$;

-- Schedule it nightly at 02:00 UTC. Requires the pg_cron extension (enable it
-- under Database → Extensions in the Supabase dashboard). Alternatively invoke
-- recalculate_question_difficulty() from a scheduled Edge Function.
-- create extension if not exists pg_cron;
-- select cron.schedule(
--   'nightly-difficulty-recalc',
--   '0 2 * * *',
--   $$ select public.recalculate_question_difficulty(); $$
-- );

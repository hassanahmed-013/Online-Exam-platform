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
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references exams(id) on delete cascade,
  parent_id uuid references categories(id) on delete set null,
  name text not null,
  sort_order int not null default 0
);

-- ---------- Questions ----------
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references exams(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  stem text not null,
  explanation text,
  difficulty text,           -- 'easy' | 'medium' | 'hard'
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

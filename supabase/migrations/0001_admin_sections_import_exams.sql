-- =============================================================
-- Migration 0001 — Admin sections, bulk-import support, configurable exams
-- Run this in the Supabase SQL editor on a project that already has the base
-- schema (supabase/schema.sql) applied. It is idempotent — safe to re-run.
-- =============================================================

create extension if not exists "pgcrypto";

-- ---------- Sections (flat, admin-managed subject cards) ----------
create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_description text not null,
  cover_image_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table sections enable row level security;

-- Students/visitors read active sections; admins manage all. (The service role
-- used by the import/CRUD server actions bypasses RLS regardless.)
drop policy if exists "sections_public_read" on sections;
create policy "sections_public_read" on sections
  for select using (is_active or public.is_admin());

drop policy if exists "sections_admin_write" on sections;
create policy "sections_admin_write" on sections
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Questions: link to sections + import/difficulty columns ----------
alter table questions
  add column if not exists section_id uuid references sections(id) on delete set null,
  add column if not exists image_url text,
  add column if not exists image_source text,           -- 'manual_upload' | 'bulk_import'
  add column if not exists original_source_url text,
  add column if not exists external_id text,             -- optional import key
  add column if not exists content_hash text,            -- dedupe key (hash of stem+options)
  add column if not exists difficulty_override text,     -- admin-forced difficulty
  add column if not exists correct_rate numeric,         -- cached correct-answer rate (0-1)
  add column if not exists attempts_sample_size int not null default 0;

alter table questions alter column difficulty set default 'medium';

-- Idempotency guards for re-uploading the same CSV.
create unique index if not exists questions_external_id_uidx
  on questions (external_id) where external_id is not null;
create unique index if not exists questions_content_hash_uidx
  on questions (content_hash) where content_hash is not null;
create index if not exists questions_section_id_idx on questions (section_id);

-- ---------- Exams: configurable lengths tied to a section ----------
alter table exams
  add column if not exists section_id uuid references sections(id) on delete cascade,
  add column if not exists available_question_counts int[] not null default '{50,100,200}',
  add column if not exists time_limit_minutes int,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

-- The base schema marks slug NOT NULL/UNIQUE; admin-built exams generate one.

-- ---------- Attempts: hold the sampled question set for a configurable exam ----------
alter table attempts
  add column if not exists question_ids uuid[],
  add column if not exists selected_count int;

-- =============================================================
-- Storage buckets (public read, admin-only write)
-- =============================================================
insert into storage.buckets (id, name, public)
values ('section-images', 'section-images', true),
       ('question-images', 'question-images', true)
on conflict (id) do nothing;

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select using (bucket_id in ('section-images', 'question-images'));

drop policy if exists "media_admin_write" on storage.objects;
create policy "media_admin_write" on storage.objects
  for all
  using (bucket_id in ('section-images', 'question-images') and public.is_admin())
  with check (bucket_id in ('section-images', 'question-images') and public.is_admin());

-- =============================================================
-- Automatic difficulty recalculation (nightly job / Edge Function)
-- Thresholds mirror src/lib/difficulty.ts.
-- =============================================================
create or replace function public.recalculate_question_difficulty()
returns void language sql as $$
  update questions q
  set
    attempts_sample_size = sub.total,
    correct_rate = sub.correct::numeric / sub.total,
    difficulty = case
      when q.difficulty_override is not null then q.difficulty_override
      when sub.total < 20 then coalesce(q.difficulty, 'medium')
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

-- Optional nightly schedule (enable pg_cron under Database → Extensions):
-- select cron.schedule('nightly-difficulty-recalc', '0 2 * * *',
--   $$ select public.recalculate_question_difficulty(); $$);

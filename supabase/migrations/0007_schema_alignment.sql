-- =============================================================
-- Migration 0007 — Schema alignment + integrity indexes
-- Brings an existing project in line with supabase/schema.sql.
-- Idempotent — safe to re-run. Does not change app behaviour.
-- =============================================================

create extension if not exists "pgcrypto";

-- ---------- Sections (no-op if 0001 already applied) ----------
create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_description text not null,
  cover_image_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table sections enable row level security;

drop policy if exists "sections_public_read" on sections;
create policy "sections_public_read" on sections
  for select using (is_active or public.is_admin());

drop policy if exists "sections_admin_write" on sections;
create policy "sections_admin_write" on sections
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Questions: import + section columns ----------
alter table questions
  add column if not exists section_id uuid references sections(id) on delete set null,
  add column if not exists image_url text,
  add column if not exists image_source text,
  add column if not exists original_source_url text,
  add column if not exists external_id text,
  add column if not exists content_hash text,
  add column if not exists difficulty_override text,
  add column if not exists correct_rate numeric,
  add column if not exists attempts_sample_size int not null default 0;

alter table questions alter column difficulty set default 'medium';

-- Section-scoped external_id (replaces global unique from 0001).
drop index if exists questions_external_id_uidx;
create unique index if not exists questions_section_external_id_uidx
  on questions (section_id, external_id)
  where external_id is not null and section_id is not null;

create unique index if not exists questions_content_hash_uidx
  on questions (content_hash) where content_hash is not null;
create index if not exists questions_section_id_idx on questions (section_id);
-- Speeds exact per-section active counts used by admin + student UIs.
create index if not exists questions_section_active_idx
  on questions (section_id) where is_active = true;

-- ---------- Exams ----------
alter table exams
  add column if not exists section_id uuid references sections(id) on delete cascade,
  add column if not exists available_question_counts int[] not null default '{20,40,100,200}',
  add column if not exists time_limit_minutes int,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

alter table exams
  alter column available_question_counts set default '{20,40,100,200}';

create index if not exists exams_created_at_idx on exams (created_at);

-- ---------- Attempts ----------
alter table attempts
  add column if not exists question_ids uuid[],
  add column if not exists selected_count int;

-- ---------- Mock papers ----------
alter table mock_exams
  add column if not exists series text,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

-- Standalone curated papers may have no parent configurable exam.
do $$
begin
  alter table mock_exams alter column exam_id drop not null;
exception
  when others then null;
end $$;

alter table mock_exam_questions enable row level security;

drop policy if exists "mock_exam_questions_public_read" on mock_exam_questions;
create policy "mock_exam_questions_public_read" on mock_exam_questions
  for select using (true);

drop policy if exists "mock_exam_questions_admin_write" on mock_exam_questions;
create policy "mock_exam_questions_admin_write" on mock_exam_questions
  for all using (public.is_admin()) with check (public.is_admin());

create index if not exists mock_exam_questions_mock_exam_id_idx
  on mock_exam_questions (mock_exam_id);
create index if not exists mock_exam_questions_sort_idx
  on mock_exam_questions (mock_exam_id, sort_order);

-- ---------- Textbooks ----------
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

-- ---------- Demo sessions: lock down to service role ----------
do $$
begin
  if to_regclass('public.demo_sessions') is not null then
    alter table demo_sessions enable row level security;
  end if;
end $$;
-- No policies → anon/authenticated denied; service role (admin client) bypasses.

-- ---------- Storage buckets + consolidated policies ----------
insert into storage.buckets (id, name, public)
values
  ('section-images', 'section-images', true),
  ('question-images', 'question-images', true),
  ('textbooks', 'textbooks', true),
  ('avatars', 'avatars', true),
  ('category-images', 'category-images', true)
on conflict (id) do nothing;

drop policy if exists "media_public_read" on storage.objects;
create policy "media_public_read" on storage.objects
  for select using (
    bucket_id in (
      'section-images',
      'question-images',
      'textbooks',
      'category-images'
    )
  );

drop policy if exists "media_admin_write" on storage.objects;
create policy "media_admin_write" on storage.objects
  for all
  using (
    bucket_id in (
      'section-images',
      'question-images',
      'textbooks',
      'category-images'
    )
    and public.is_admin()
  )
  with check (
    bucket_id in (
      'section-images',
      'question-images',
      'textbooks',
      'category-images'
    )
    and public.is_admin()
  );

drop policy if exists "textbooks_media_public_read" on storage.objects;
create policy "textbooks_media_public_read" on storage.objects
  for select using (bucket_id = 'textbooks');

drop policy if exists "textbooks_media_admin_write" on storage.objects;
create policy "textbooks_media_admin_write" on storage.objects
  for all
  using (bucket_id = 'textbooks' and public.is_admin())
  with check (bucket_id = 'textbooks' and public.is_admin());

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_own_insert" on storage.objects;
create policy "avatars_own_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_own_update" on storage.objects;
create policy "avatars_own_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_own_delete" on storage.objects;
create policy "avatars_own_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- Difficulty recalculation (same thresholds as src/lib/difficulty.ts) ----------
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

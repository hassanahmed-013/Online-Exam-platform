-- =============================================================
-- Migration 0003 — Curated mock papers + question assignment
-- Run after 0001. Idempotent — safe to re-run.
-- =============================================================

-- Series label for grouping papers (e.g. "Mock Exam A")
alter table mock_exams
  add column if not exists series text,
  add column if not exists is_active boolean not null default true,
  add column if not exists created_at timestamptz not null default now();

-- exam_id is optional for standalone curated papers (no parent configurable exam)
alter table mock_exams alter column exam_id drop not null;

-- Junction already exists in base schema; ensure RLS + admin policies
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

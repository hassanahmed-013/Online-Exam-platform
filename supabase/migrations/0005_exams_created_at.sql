-- =============================================================
-- Migration 0005 — exams.created_at (fixes admin/student exam lists)
-- Idempotent — safe to re-run.
-- =============================================================
-- getAdminExams / getActiveExams order by created_at. Without this column
-- the query fails and both pages look permanently empty even after inserts.

alter table exams
  add column if not exists created_at timestamptz not null default now();

create index if not exists exams_created_at_idx on exams (created_at);

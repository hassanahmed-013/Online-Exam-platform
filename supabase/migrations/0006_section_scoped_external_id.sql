-- =============================================================
-- Migration 0006 — Scope external_id uniqueness per section
-- Safe to re-run. Re-asserted again in 0007 for alignment.
-- =============================================================

-- Global unique external_id blocked the same CSV ids across Biology / MRCP.
drop index if exists questions_external_id_uidx;

create unique index if not exists questions_section_external_id_uidx
  on questions (section_id, external_id)
  where external_id is not null and section_id is not null;

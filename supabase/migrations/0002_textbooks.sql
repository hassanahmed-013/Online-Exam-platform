-- =============================================================
-- Migration 0002 — Textbooks / study documents
-- Admin uploads PDFs (and similar) that students see under Textbooks.
-- Idempotent — safe to re-run in the Supabase SQL editor.
-- =============================================================

create table if not exists textbooks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  tag text not null default 'High-yield',   -- 'High-yield' | 'Extended'
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

-- Storage: public read, admin write (service role bypasses RLS for uploads)
insert into storage.buckets (id, name, public)
values ('textbooks', 'textbooks', true)
on conflict (id) do nothing;

drop policy if exists "textbooks_media_public_read" on storage.objects;
create policy "textbooks_media_public_read" on storage.objects
  for select using (bucket_id = 'textbooks');

drop policy if exists "textbooks_media_admin_write" on storage.objects;
create policy "textbooks_media_admin_write" on storage.objects
  for all
  using (bucket_id = 'textbooks' and public.is_admin())
  with check (bucket_id = 'textbooks' and public.is_admin());

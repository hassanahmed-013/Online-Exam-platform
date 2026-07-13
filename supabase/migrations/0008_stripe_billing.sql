-- =============================================================
-- Migration 0008 — Stripe billing fields
-- Idempotent — safe to re-run.
-- =============================================================

alter table profiles
  add column if not exists stripe_customer_id text;

create unique index if not exists profiles_stripe_customer_id_uidx
  on profiles (stripe_customer_id)
  where stripe_customer_id is not null;

-- Optional: store Stripe subscription id on the access row (payment_ref already exists).
comment on column subscriptions.payment_ref is
  'External payment reference (e.g. Stripe subscription id or Checkout session id).';

# MedPrep — MDCAT Prep Platform

A subscription-style MDCAT exam-preparation platform (modelled on PassMedicine):
practise MCQs by subject, sit timed mock exams, review past attempts, and track
performance. Built with **Next.js (App Router) · TypeScript · Tailwind v4 ·
shadcn/ui · Framer Motion · Recharts · Supabase**.

> **Production path:** configure Supabase (URL, anon key, **service role key**)
> and run the SQL migrations under `supabase/migrations/`. Without env vars,
> marketing pages still render; dashboard / exam / admin routes expect a live
> backend.

## Getting started

```bash
npm install
npm run dev
```

Open the printed URL (defaults to http://localhost:3000).

## What's built

| Area | Route | Notes |
|---|---|---|
| Landing page | `/` | Hero, subject cards, features, pricing |
| Subjects | `/categories` | Live sections from Supabase |
| Category demo | `/categories/[slug]/demo` | Guest demo (tracks `demo_sessions`) |
| Auth | `/login`, `/signup`, `/reset-password` | Supabase auth (+ optional demo cookie) |
| Dashboard | `/dashboard/*` | Bank, timed, mocks, **live** Review & Performance |
| Runner | `/exam/run` | Practice (instant feedback) · Timed/Mock (feedback after submit) |
| Results | `/exam/results` | Score + review; PDF from server-scored data when possible |
| Admin | `/admin/*` | Sections, exams, questions, bulk import, users, subscriptions, analytics |

### Runner modes

- **Practice** — untimed, instant correct/wrong + explanation.
- **Timed / Mock** — countdown, answers hidden until Submit; mock blocked on mobile.
- On submit, answers are written to `attempt_answers` and the attempt is marked completed (also kept in `sessionStorage` for reload).

### Access control

- `src/proxy.ts` gates `/dashboard`, `/admin`, `/exam` (sign-in required; admin role for `/admin`).
- Admin mutations and CSV import require an **admin** profile (not just the service-role key).
- Starting bank / exam / mock sessions requires an **active subscription** (admins bypass). Students pay via **Stripe Checkout** on the pricing section; admins can still grant plans from Admin → Users.

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the database:
   - **Fresh project:** run [`supabase/schema.sql`](supabase/schema.sql) (canonical).
   - **Existing project:** run migrations in order under `supabase/migrations/` (`0001` … `0008_stripe_billing.sql`). All are idempotent.
3. Copy `.env.local.example` to `.env.local` and fill Supabase + Stripe keys (see below).

4. Promote your user to admin in SQL:

   ```sql
   update profiles set role = 'admin' where id = '<your-user-uuid>';
   ```

## Stripe billing

1. In [Stripe Dashboard](https://dashboard.stripe.com) create two **recurring** products/prices (e.g. Monthly Rs 1,500 and Annual Rs 9,000).
2. Put the Price IDs and secret key in `.env.local`:

   ```env
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PRICE_MONTHLY=price_...
   STRIPE_PRICE_ANNUAL=price_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. Forward webhooks locally:

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

   Use the printed `whsec_…` as `STRIPE_WEBHOOK_SECRET`. In production, add an endpoint for `https://your-domain/api/stripe/webhook` listening for:
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.

4. Run migration `0008_stripe_billing.sql` so `profiles.stripe_customer_id` exists.

5. As a **student** (not admin), open `/#pricing` → **Go monthly** / **Go annual** → Stripe Checkout. On success, access is activated via the webhook.

## Project structure

```
src/
  app/                 routes (auth, dashboard, admin, exam, demo)
  components/          ui, marketing, dashboard, admin, runner
  lib/
    actions/           server actions (attempts, exams, import helpers, …)
    admin-data.ts      admin reads
    student-analytics.ts  live Review / Performance
    session-store.ts   client save/resume + results summary
    proxy.ts           Next.js 16 route protection
supabase/
  schema.sql
  migrations/
```

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build
npm run start   # serve the build
npm run lint    # eslint
```

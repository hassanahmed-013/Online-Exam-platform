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
- Starting bank / exam / mock sessions requires an **active subscription** (admins bypass). Grant plans from Admin → Users.

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run [`supabase/schema.sql`](supabase/schema.sql), then migrations in order
   (`0001` … `0006_section_scoped_external_id.sql`).
3. Copy `.env.local.example` to `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

4. Promote your user to admin in SQL:

   ```sql
   update profiles set role = 'admin' where id = '<your-user-uuid>';
   ```

5. Grant yourself a plan from Admin → Users (or SQL) so student session starts work.

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

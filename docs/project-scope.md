# MDCAT Prep Platform — Project Scope & Documentation
*(Modeled on PassMedicine.com — Next.js App Router + Supabase + Tailwind + Framer Motion)*

---

## 1. Project Overview

A subscription-based MDCAT exam preparation platform where students practice MCQs by subject/category, sit timed mock exams, review past attempts, and track performance — closely mirroring PassMedicine's UX (sidebar navigation, question bank stats, mock exam papers, review/key-concepts list).

**Primary user roles:**
- **Guest** — sees landing page, can try a time-limited demo session, must sign up to unlock full access.
- **Student (authenticated)** — full question bank access based on subscription plan.
- **Admin** — manages exams, categories, questions (single + bulk CSV), users, subscriptions, and views platform-wide analytics.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, Server Components + Server Actions) |
| Backend/DB | Supabase (Postgres, Auth, RLS, Storage) |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Charts | Recharts (performance analytics) |
| Auth | Supabase Auth (email/password, optional OAuth) |
| Bulk import | CSV parsing (papaparse) via Admin panel |
| Hosting | Vercel (app) + Supabase (managed backend) |

---

## 3. Core Features

### 3.1 Public Landing Page
- Hero section (headline + CTA), based on Image 1.
- **Exam section cards** — one card per exam (e.g., "MDCAT", or if multi-exam later: "Biology", "Physics", "Chemistry", "English Reasoning" bundles). Each card shows:
  - Cover image
  - Exam name
  - Short description
  - Two buttons: **Demo** and **Sign up**
- Auth entry points: Sign up (dropdown/modal), Log in (email + password fields in navbar).

### 3.2 Demo Mode (no login required)
- Clicking **Demo** on a card starts a **temporary, unauthenticated question session** (mirrors Image 2 behavior — a session preview appears for a limited time).
- Implementation approach:
  - A fixed set of ~5–10 "demo" questions (flagged `is_demo = true` in `questions` table) is pulled server-side.
  - Session runs in a stripped-down runner UI with a visible countdown (e.g., 60–90 seconds) rendered via Framer Motion.
  - On timeout or completion, an overlay locks the screen and prompts **Sign up to continue** — no answers/progress are persisted for guests (or persisted in `sessionStorage`/temp table keyed by a random token, cleared on expiry).
  - No Supabase Auth session is created; guest demo state lives client-side or in a short-lived `demo_sessions` table (auto-expiring row, no user_id).

### 3.3 Authentication
- Sign up (email, password, name) → Supabase Auth → trigger creates row in `profiles`.
- Log in / log out.
- Password reset flow.
- Session-aware navbar (fixes the "unauthenticated user sees protected links" bug pattern from your Linktree project — reuse that fix here).

### 3.4 Student Dashboard (post-login home) — Image 2
Sidebar sections:
- **Home** — exam overview, quick-stat icons (calendar/exam date, streak, sessions, score %), "Continue questions" card showing last-used category, Textbooks quick links.
- **Questions**
  - Question bank
  - Fixed sets & timed tests
  - Mock exams
  - Review questions
- **Performance** — analytics/score breakdown.
- **Textbooks** — High-yield / Extended (optional phase 2 content module).

### 3.5 Question Bank — Image 3
- Header stats: "You've answered **X** questions with an average score of **Y%**."
- Category checklist (All + each subject) with **attempted/total** counts per category (e.g., "Cardiology — 1 of 692").
- Multi-select categories → **Start the questions** button launches a filtered session.
- **Recent sessions** panel: mode (Standard), category, "Continue" link, relative timestamp.

### 3.6 Question Runner Engine (Three Modes)
As already scoped in your project: build one shared runner component with mode-specific behavior:
1. **Standard/Practice mode** — untimed, immediate feedback + explanation after each answer, can flag/skip.
2. **Timed test mode** — countdown per question or per set, feedback deferred until submission.
3. **Mock exam mode** — full paper simulation (e.g., 100 questions / 180 minutes), no feedback until the whole paper is submitted, save-and-resume supported, mobile blocked (matches Image 4's "not able to take a mock exam using a mobile phone" note — enforce via viewport check).

Each mode writes to a shared `attempts` / `attempt_answers` table structure (see schema below) with a `mode` column so scoring/analytics logic stays unified.

### 3.7 Mock Exams — Image 4
- Listed as named papers (e.g., "Mock Exam A — Paper 1", "Paper 2", Mock B, Mock C…).
- Each card shows question count + duration.
- Mock exam results are **isolated** from main question bank stats (separate `is_mock = true` flag on attempts, excluded from question-bank averages).
- Supports save/resume mid-exam (persist `current_question_index` + answers on each navigation, not just on submit).

### 3.8 Review Questions & Key Concepts — Image 5
- Toggle: **Questions** vs **Key concepts**.
- Search bar + sort (by date / alphabetically).
- Per-category filter checklist (same list as question bank).
- Each row: date answered, question title, snippet, difficulty-vote arrows (up/down), remove (X) button, **Review** button (reopens that question with explanation).

### 3.9 Performance / Analytics
- Score % over time (line chart), accuracy by category (bar chart), weak-topic detection (lowest-scoring categories surfaced first), streak tracker.

### 3.10 Admin Dashboard
- **Auth-gated** by `role = 'admin'` in `profiles`, protected via RLS + middleware route guard on `/admin/*`.
- Modules:
  - **Exams/Categories** — CRUD for exam types and subject categories (hierarchical: Exam → Category → Subcategory optional).
  - **Questions** — CRUD single question (stem, options, correct answer, explanation, difficulty, category, tags, `is_demo` flag); **bulk CSV import** with validation + error report (matches your stated requirement).
  - **Mock Exams** — assemble question sets into named papers with time limits.
  - **Users** — list, search, view subscription status, manually grant/revoke access, impersonate-view (read-only) for support.
  - **Subscriptions** — plan management, expiry dates, payment status (see schema decision below).
  - **Analytics (platform-wide)** — DAU/MAU, most-attempted categories, average scores, signup funnel (demo → signup conversion rate), question-level stats (most-missed questions).
  - **Content flags** — review questions users have flagged as wrong/unclear.

---

## 4. Database Schema (Supabase / Postgres)

### Decision: dedicated `subscriptions` table (not a denormalized `profiles.plan` field)
**Why:** subscriptions need their own history (renewals, upgrades/downgrades, expiry, payment provider refs), and a 1-to-many relationship (a user could have past + current subscriptions). A denormalized field can't hold history and complicates admin auditing. Use a lightweight `profiles.current_plan` **cached column** (denormalized for fast reads) that's kept in sync via a trigger/webhook from the `subscriptions` table — best of both worlds.

```sql
-- Users (extends Supabase auth.users)
profiles (
  id uuid primary key references auth.users(id),
  full_name text,
  avatar_url text,
  role text default 'student', -- 'student' | 'admin'
  current_plan text default 'free', -- cached from subscriptions
  plan_expires_at timestamptz,
  created_at timestamptz default now()
)

subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  plan text not null, -- 'monthly' | 'annual' | 'lifetime'
  status text not null, -- 'active' | 'expired' | 'cancelled'
  starts_at timestamptz,
  ends_at timestamptz,
  payment_ref text,
  created_at timestamptz default now()
)

exams (
  id uuid primary key default gen_random_uuid(),
  name text not null,           -- e.g., "MDCAT"
  slug text unique not null,
  description text,
  cover_image_url text,
  is_published boolean default true
)

categories (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references exams(id),
  parent_id uuid references categories(id), -- null = top-level
  name text not null,
  sort_order int default 0
)

questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references exams(id),
  category_id uuid references categories(id),
  stem text not null,
  explanation text,
  difficulty text, -- 'easy' | 'medium' | 'hard'
  is_demo boolean default false,
  is_active boolean default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
)

question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id),
  option_text text not null,
  is_correct boolean default false,
  sort_order int
)

mock_exams (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid references exams(id),
  name text not null, -- "Mock Exam A - Paper 1"
  question_count int,
  duration_minutes int
)

mock_exam_questions (
  mock_exam_id uuid references mock_exams(id),
  question_id uuid references questions(id),
  sort_order int,
  primary key (mock_exam_id, question_id)
)

attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id), -- null allowed for demo/guest (temp token instead)
  guest_token text, -- used only when user_id is null (demo mode)
  exam_id uuid references exams(id),
  mode text not null, -- 'practice' | 'timed' | 'mock'
  mock_exam_id uuid references mock_exams(id), -- null unless mode='mock'
  category_ids uuid[], -- selected categories for practice/timed
  status text default 'in_progress', -- 'in_progress' | 'completed' | 'abandoned'
  started_at timestamptz default now(),
  completed_at timestamptz,
  score_percent numeric
)

attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references attempts(id),
  question_id uuid references questions(id),
  selected_option_id uuid references question_options(id),
  is_correct boolean,
  flagged boolean default false, -- user flagged for review
  answered_at timestamptz default now()
)

reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  question_id uuid references questions(id),
  vote text, -- 'up' | 'down' (difficulty feedback arrows)
  removed boolean default false, -- the "X" remove-from-review-list action
  created_at timestamptz default now()
)

demo_sessions (
  token text primary key,
  question_ids uuid[],
  expires_at timestamptz not null
)
```

**RLS notes:**
- `attempts`/`attempt_answers`: row visible only where `user_id = auth.uid()`.
- `questions`/`options`: read-only for students; full CRUD only for `role = 'admin'`.
- `demo_sessions`: publicly insertable/readable by token match only, auto-cleaned via a scheduled Supabase Edge Function or cron deleting expired rows.

---

## 5. Route Map (Next.js App Router)

```
/                          → Landing page (exam cards, demo, signup, login)
/demo/[examSlug]           → Guest demo runner (timed, no auth)
/login
/signup
/dashboard                 → Student home (Image 2)
/dashboard/question-bank   → Category picker + start session (Image 3)
/dashboard/mock-exams      → Mock exam list (Image 4)
/dashboard/review          → Review questions & key concepts (Image 5)
/dashboard/performance     → Analytics
/dashboard/textbooks       → High-yield / extended textbook viewer
/exam/[attemptId]/run      → Shared question runner (practice/timed/mock)
/exam/[attemptId]/results  → Post-attempt results/breakdown

/admin                     → Admin home (KPIs)
/admin/exams
/admin/categories
/admin/questions
/admin/questions/import    → Bulk CSV import
/admin/mock-exams
/admin/users
/admin/subscriptions
/admin/analytics
```

---

## 6. Non-Functional Requirements
- Mobile-responsive except mock exam mode (blocked on small viewports, matching PassMedicine's real behavior).
- Save-and-resume on all session types (write answer on each navigation, not just submit).
- Demo sessions must be fully isolated from real user data (no auth session created).
- Bulk CSV import must validate row-by-row and return a per-row error report rather than failing the whole batch.
- Admin actions (question edits/deletes) should be audit-logged (`created_by`, `updated_by`, timestamps).

---

## 7. Suggested Build Phases
1. **Foundation** — Supabase schema + RLS, auth flow, landing page + demo mode.
2. **Core runner** — practice mode only, question bank category picker, results page.
3. **Timed + Mock modes** — extend runner, add mock exam admin builder.
4. **Review + Performance** — review list, analytics charts.
5. **Admin panel** — CRUD + bulk import + subscriptions + platform analytics.
6. **Polish** — Framer Motion transitions, textbooks module, edge cases (save/resume, mobile blocking).

---

*This document is written to be handed to Kiro section-by-section (e.g., "Phase 1 — Foundation" as its own prompt) rather than as one giant build request.*

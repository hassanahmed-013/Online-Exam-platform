// Read helpers for admin server components. These use the service-role client
// so admins see everything (including inactive rows). When the service-role key
// isn't set they degrade to empty lists so the pages render a setup banner
// instead of crashing.
import { createAdminClient, hasServiceRole } from "./supabase/admin";
import { classifyDifficulty, type DifficultyResult } from "./difficulty";
import type {
  AdminMockPaper,
  CategoryPerformance,
  Difficulty,
  ExamConfig,
  Question,
  QuestionOption,
  Section,
} from "./types";

export { hasServiceRole };
export type { AdminMockPaper };

export interface AdminQuestionRow {
  question: Question;
  stats?: { total: number; correct: number };
  classification: DifficultyResult;
}

/** All sections (active + inactive) with active-question counts. */
export async function getAdminSections(): Promise<Section[]> {
  if (!hasServiceRole) return [];
  const sb = createAdminClient();
  const { data: sections } = await sb
    .from("sections")
    .select("*")
    .order("created_at", { ascending: true });
  const list = (sections ?? []) as Section[];
  // Exact per-section counts — a single unbounded select is capped by PostgREST
  // and under-counts older sections after a large import into another section.
  const counted = await Promise.all(
    list.map(async (s) => {
      const { count } = await sb
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("section_id", s.id)
        .eq("is_active", true);
      return [s.id, count ?? 0] as const;
    })
  );
  const counts = Object.fromEntries(counted);
  return list.map((s) => ({
    ...s,
    question_count: counts[s.id] ?? 0,
  }));
}

/** All exams with their section name resolved. */
export async function getAdminExams(): Promise<ExamConfig[]> {
  if (!hasServiceRole) return [];
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("exams")
    .select(
      "id,name,slug,section_id,available_question_counts,time_limit_minutes,is_active,created_at,sections(name)"
    )
    .order("created_at", { ascending: true });
  if (error) {
    // Fallback when created_at isn't migrated yet — still return exams.
    console.error("[admin exams]", error.message);
    const { data: fallback, error: fbErr } = await sb
      .from("exams")
      .select(
        "id,name,slug,section_id,available_question_counts,time_limit_minutes,is_active,sections(name)"
      )
      .order("name", { ascending: true });
    if (fbErr) {
      console.error("[admin exams fallback]", fbErr.message);
      return [];
    }
    return mapExamRows(fallback);
  }
  return mapExamRows(data);
}

function mapExamRows(
  data: unknown
): ExamConfig[] {
  return (
    (data ?? []) as unknown as (ExamConfig & {
      sections: { name: string } | null;
    })[]
  ).map((e) => ({
    id: e.id,
    name: e.name,
    slug: e.slug,
    section_id: e.section_id,
    section_name: e.sections?.name ?? null,
    available_question_counts: e.available_question_counts ?? [],
    time_limit_minutes: e.time_limit_minutes,
    is_active: e.is_active,
  }));
}

/** Profiles + latest subscription + auth email. */
export async function getAdminSubscriptions(): Promise<
  {
    id: string;
    user: string;
    plan: string;
    amount: string;
    status: string;
    renews: string;
  }[]
> {
  if (!hasServiceRole) return [];
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("subscriptions")
    .select("id, plan, status, ends_at, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[admin subscriptions]", error.message);
    return [];
  }
  const userIds = [
    ...new Set(
      ((data ?? []) as { user_id: string }[]).map((s) => s.user_id).filter(Boolean)
    ),
  ];
  const nameById = new Map<string, string>();
  if (userIds.length) {
    const { data: profiles } = await sb
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    for (const p of (profiles ?? []) as { id: string; full_name: string | null }[]) {
      nameById.set(p.id, p.full_name?.trim() || "User");
    }
  }
  const amountFor = (plan: string) =>
    plan === "lifetime" ? "—" : plan === "annual" ? "Annual" : "Monthly";
  return ((data ?? []) as {
    id: string;
    plan: string;
    status: string;
    ends_at: string | null;
    user_id: string;
  }[]).map((s) => ({
    id: s.id,
    user: nameById.get(s.user_id) || "User",
    plan: s.plan,
    amount: amountFor(s.plan),
    status: s.status,
    renews: s.ends_at
      ? new Date(s.ends_at).toLocaleDateString()
      : s.plan === "lifetime"
        ? "Never"
        : "—",
  }));
}

/** Live questions for the admin table (imported + manually created). */
export async function getAdminQuestions(
  sectionId?: string | null,
  opts?: { page?: number; pageSize?: number }
): Promise<{ rows: AdminQuestionRow[]; total: number; page: number; pageSize: number }> {
  if (!hasServiceRole) return { rows: [], total: 0, page: 1, pageSize: 50 };
  const sb = createAdminClient();
  const pageSize = Math.min(200, Math.max(20, opts?.pageSize ?? 50));
  const page = Math.max(1, opts?.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let countQuery = sb
    .from("questions")
    .select("id", { count: "exact", head: true });
  if (sectionId) countQuery = countQuery.eq("section_id", sectionId);
  const { count } = await countQuery;

  let query = sb
    .from("questions")
    .select(
      "id,section_id,stem,explanation,difficulty,difficulty_override,correct_rate,attempts_sample_size,image_url,image_source,is_demo,is_active,question_options(id,option_text,is_correct,sort_order),sections(name)"
    )
    .order("created_at", { ascending: false })
    .range(from, to);
  if (sectionId) {
    query = query.eq("section_id", sectionId);
  }
  const { data } = await query;

  type Row = {
    id: string;
    section_id: string | null;
    stem: string;
    explanation: string | null;
    difficulty: string | null;
    difficulty_override: string | null;
    correct_rate: number | null;
    attempts_sample_size: number | null;
    image_url: string | null;
    image_source: string | null;
    is_demo: boolean | null;
    question_options: {
      id: string;
      option_text: string;
      is_correct: boolean;
      sort_order: number | null;
    }[];
    sections: { name: string } | null;
  };

  const rows = ((data ?? []) as unknown as Row[]).map((q) => {
    const options: QuestionOption[] = [...(q.question_options ?? [])]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((o) => ({
        id: o.id,
        option_text: o.option_text,
        is_correct: o.is_correct,
        sort_order: o.sort_order ?? 0,
      }));
    const question: Question = {
      id: q.id,
      exam_id: "",
      category_id: q.section_id ?? "",
      category_name: q.sections?.name ?? "Unassigned",
      stem: q.stem,
      explanation: q.explanation ?? "",
      difficulty: (q.difficulty as Difficulty) ?? "medium",
      difficulty_override: (q.difficulty_override as Difficulty | null) ?? null,
      correct_rate: q.correct_rate ?? undefined,
      attempts_sample_size: q.attempts_sample_size ?? 0,
      is_demo: q.is_demo ?? false,
      image_url: q.image_url ?? undefined,
      image_source: (q.image_source as Question["image_source"]) ?? undefined,
      options,
    };
    const sample = q.attempts_sample_size ?? 0;
    const stats =
      sample > 0 && q.correct_rate != null
        ? {
            total: sample,
            correct: Math.round(q.correct_rate * sample),
          }
        : undefined;
    return {
      question,
      stats,
      classification: classifyDifficulty({
        correctRate: q.correct_rate ?? undefined,
        sampleSize: sample,
        adminDifficulty: question.difficulty,
        override: question.difficulty_override,
      }),
    };
  });

  return { rows, total: count ?? 0, page, pageSize };
}

// ---------- Admin overview KPIs (live Supabase aggregates) ----------

export interface AdminOverviewKpis {
  totalUsers: number | null;
  activeSubs: number | null;
  dau: number | null;
  mau: number | null;
  questionsAnswered: number | null;
}

export interface SignupTrendPoint {
  date: string;
  signups: number;
}

export interface MostMissedQuestion {
  stem: string;
  category: string;
  missRate: number;
}

export interface AdminOverview {
  kpis: AdminOverviewKpis;
  signupTrend: SignupTrendPoint[];
  mostMissed: MostMissedQuestion[];
}

function formatMonthLabel(d: Date) {
  return d.toLocaleString("en-US", { month: "short" });
}

async function safeCount(
  label: string,
  fn: () => Promise<number>
): Promise<number | null> {
  try {
    return await fn();
  } catch (e) {
    console.error(`[admin overview] ${label} failed:`, e);
    return null;
  }
}

/** Live KPIs / charts for the admin overview page. Each metric is isolated. */
export async function getAdminOverview(): Promise<AdminOverview> {
  const empty: AdminOverview = {
    kpis: {
      totalUsers: null,
      activeSubs: null,
      dau: null,
      mau: null,
      questionsAnswered: null,
    },
    signupTrend: [],
    mostMissed: [],
  };
  if (!hasServiceRole) return empty;

  const sb = createAdminClient();
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sixMonthsAgo = new Date(now - 183 * 24 * 60 * 60 * 1000);
  sixMonthsAgo.setUTCDate(1);
  sixMonthsAgo.setUTCHours(0, 0, 0, 0);

  const [totalUsers, activeSubs, dau, mau, questionsAnswered, signupTrend, mostMissed] =
    await Promise.all([
      safeCount("totalUsers", async () => {
        const { count, error } = await sb
          .from("profiles")
          .select("*", { count: "exact", head: true });
        if (error) throw error;
        return count ?? 0;
      }),
      safeCount("activeSubs", async () => {
        const { count, error } = await sb
          .from("subscriptions")
          .select("*", { count: "exact", head: true })
          .eq("status", "active");
        if (error) throw error;
        return count ?? 0;
      }),
      safeCount("dau", async () => {
        const { data, error } = await sb
          .from("attempts")
          .select("user_id")
          .gte("started_at", dayAgo)
          .not("user_id", "is", null);
        if (error) throw error;
        return new Set((data ?? []).map((r: { user_id: string }) => r.user_id)).size;
      }),
      safeCount("mau", async () => {
        const { data, error } = await sb
          .from("attempts")
          .select("user_id")
          .gte("started_at", monthAgo)
          .not("user_id", "is", null);
        if (error) throw error;
        return new Set((data ?? []).map((r: { user_id: string }) => r.user_id)).size;
      }),
      safeCount("questionsAnswered", async () => {
        const { count, error } = await sb
          .from("attempt_answers")
          .select("*", { count: "exact", head: true });
        if (error) throw error;
        return count ?? 0;
      }),
      (async (): Promise<SignupTrendPoint[]> => {
        try {
          const { data, error } = await sb
            .from("profiles")
            .select("created_at")
            .gte("created_at", sixMonthsAgo.toISOString());
          if (error) throw error;

          const buckets = new Map<string, number>();
          for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setUTCDate(1);
            d.setUTCHours(0, 0, 0, 0);
            d.setUTCMonth(d.getUTCMonth() - i);
            const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
            buckets.set(key, 0);
          }
          for (const row of data ?? []) {
            const d = new Date((row as { created_at: string }).created_at);
            const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
            if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
          }
          return [...buckets.entries()].map(([key, signups]) => {
            const [y, m] = key.split("-").map(Number);
            return { date: formatMonthLabel(new Date(Date.UTC(y, m - 1, 1))), signups };
          });
        } catch (e) {
          console.error("[admin overview] signupTrend failed:", e);
          return [];
        }
      })(),
      (async (): Promise<MostMissedQuestion[]> => {
        try {
          const { data, error } = await sb
            .from("questions")
            .select("stem,correct_rate,sections(name)")
            .gte("attempts_sample_size", 20)
            .not("correct_rate", "is", null)
            .eq("is_active", true)
            .order("correct_rate", { ascending: true })
            .limit(4);
          if (error) throw error;
          type Row = {
            stem: string;
            correct_rate: number;
            sections: { name: string } | null;
          };
          return ((data ?? []) as unknown as Row[]).map((q) => ({
            stem: q.stem,
            category: q.sections?.name ?? "Unassigned",
            missRate: Math.round((1 - q.correct_rate) * 100),
          }));
        } catch (e) {
          console.error("[admin overview] mostMissed failed:", e);
          return [];
        }
      })(),
    ]);

  return {
    kpis: { totalUsers, activeSubs, dau, mau, questionsAnswered },
    signupTrend,
    mostMissed,
  };
}

// ---------- Admin analytics (platform-wide engagement) ----------

export interface AdminAnalyticsKpis {
  mau: number | null;
  dau: number | null;
  demoConversion: number | null;
  activeSubs: number | null;
}

export interface AdminAnalytics {
  kpis: AdminAnalyticsKpis;
  signupTrend: SignupTrendPoint[];
  categoryPerformance: CategoryPerformance[];
  mostMissed: MostMissedQuestion[];
}

/** Live KPIs / charts for the admin analytics page. */
export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const empty: AdminAnalytics = {
    kpis: { mau: null, dau: null, demoConversion: null, activeSubs: null },
    signupTrend: [],
    categoryPerformance: [],
    mostMissed: [],
  };
  if (!hasServiceRole) return empty;

  const sb = createAdminClient();
  const overview = await getAdminOverview();

  const [demoConversion, categoryPerformance] = await Promise.all([
    (async (): Promise<number | null> => {
      try {
        const [{ count: demos, error: dErr }, { count: signups, error: sErr }] =
          await Promise.all([
            sb.from("demo_sessions").select("*", { count: "exact", head: true }),
            sb.from("profiles").select("*", { count: "exact", head: true }),
          ]);
        if (dErr) throw dErr;
        if (sErr) throw sErr;
        const demoCount = demos ?? 0;
        const signupCount = signups ?? 0;
        if (demoCount <= 0) return null;
        return Math.min(100, Math.round((signupCount / demoCount) * 100));
      } catch (e) {
        console.error("[admin analytics] demoConversion failed:", e);
        return null;
      }
    })(),
    (async (): Promise<CategoryPerformance[]> => {
      try {
        const { data, error } = await sb
          .from("questions")
          .select("correct_rate,attempts_sample_size,sections(name)")
          .eq("is_active", true)
          .gt("attempts_sample_size", 0);
        if (error) throw error;

        type Row = {
          correct_rate: number | null;
          attempts_sample_size: number;
          sections: { name: string } | null;
        };
        const buckets = new Map<
          string,
          { answered: number; correctWeighted: number }
        >();
        for (const q of (data ?? []) as unknown as Row[]) {
          const name = q.sections?.name ?? "Unassigned";
          const answered = q.attempts_sample_size ?? 0;
          if (answered <= 0 || q.correct_rate == null) continue;
          const cur = buckets.get(name) ?? { answered: 0, correctWeighted: 0 };
          cur.answered += answered;
          cur.correctWeighted += q.correct_rate * answered;
          buckets.set(name, cur);
        }
        return [...buckets.entries()]
          .map(([category, { answered, correctWeighted }]) => ({
            category,
            answered,
            accuracy: Math.round((correctWeighted / answered) * 100),
          }))
          .sort((a, b) => b.answered - a.answered);
      } catch (e) {
        console.error("[admin analytics] categoryPerformance failed:", e);
        return [];
      }
    })(),
  ]);

  return {
    kpis: {
      mau: overview.kpis.mau,
      dau: overview.kpis.dau,
      demoConversion,
      activeSubs: overview.kpis.activeSubs,
    },
    signupTrend: overview.signupTrend,
    categoryPerformance,
    mostMissed: overview.mostMissed,
  };
}

// ---------- Admin users ----------

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: "free" | "active" | "expired" | "cancelled";
  joined: string;
}

/** Profiles + latest subscription + auth email. */
export async function getAdminUsers(): Promise<AdminUserListItem[]> {
  if (!hasServiceRole) return [];
  const sb = createAdminClient();

  const [{ data: profiles, error: pErr }, { data: subs, error: sErr }] =
    await Promise.all([
      sb
        .from("profiles")
        .select("id, full_name, created_at")
        .order("created_at", { ascending: false }),
      sb
        .from("subscriptions")
        .select("user_id, plan, status, created_at")
        .order("created_at", { ascending: false }),
    ]);

  if (pErr) {
    console.error("[admin users] profiles:", pErr.message);
    return [];
  }
  if (sErr) console.error("[admin users] subscriptions:", sErr.message);

  // Latest subscription per user (rows already newest-first).
  const latestSub = new Map<string, { plan: string; status: string }>();
  for (const s of (subs ?? []) as {
    user_id: string;
    plan: string;
    status: string;
  }[]) {
    if (!latestSub.has(s.user_id)) {
      latestSub.set(s.user_id, { plan: s.plan, status: s.status });
    }
  }

  // Emails live on auth.users — page through the admin API.
  const emailById = new Map<string, string>();
  try {
    let page = 1;
    const perPage = 200;
    for (;;) {
      const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("[admin users] listUsers:", error.message);
        break;
      }
      const users = data?.users ?? [];
      for (const u of users) {
        if (u.email) emailById.set(u.id, u.email);
      }
      if (users.length < perPage) break;
      page += 1;
      if (page > 50) break; // hard cap ~10k
    }
  } catch (e) {
    console.error("[admin users] listUsers:", e);
  }

  return ((profiles ?? []) as { id: string; full_name: string | null; created_at: string }[]).map(
    (p) => {
      const sub = latestSub.get(p.id);
      const status = !sub
        ? ("free" as const)
        : (sub.status as "active" | "expired" | "cancelled");
      const plan =
        !sub || status === "cancelled" || status === "expired"
          ? "Free"
          : sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1);
      return {
        id: p.id,
        name: p.full_name?.trim() || "Unnamed",
        email: emailById.get(p.id) ?? "",
        plan: status === "active" ? plan : "Free",
        status: status === "active" ? "active" : status === "free" ? "free" : status,
        joined: p.created_at,
      };
    }
  );
}

// ---------- Admin mock papers (curated fixed sets) ----------

export async function getAdminMockPapers(): Promise<AdminMockPaper[]> {
  if (!hasServiceRole) return [];
  const sb = createAdminClient();
  const [{ data: papers, error }, { data: links }] = await Promise.all([
    sb
      .from("mock_exams")
      .select("id, name, series, duration_minutes, is_active")
      .order("created_at", { ascending: false }),
    sb.from("mock_exam_questions").select("mock_exam_id"),
  ]);
  if (error) {
    // Older DBs may lack series/is_active/created_at — retry minimal columns.
    const { data: fallback, error: e2 } = await sb
      .from("mock_exams")
      .select("id, name, duration_minutes, question_count")
      .order("name");
    if (e2) {
      console.error("[admin mock papers]:", error.message, e2.message);
      return [];
    }
    return ((fallback ?? []) as {
      id: string;
      name: string;
      duration_minutes: number | null;
      question_count: number | null;
    }[]).map((p) => ({
      id: p.id,
      name: p.name,
      series: "",
      duration_minutes: p.duration_minutes ?? 0,
      question_count: p.question_count ?? 0,
      is_active: true,
    }));
  }

  const counts: Record<string, number> = {};
  for (const r of (links ?? []) as { mock_exam_id: string }[]) {
    counts[r.mock_exam_id] = (counts[r.mock_exam_id] ?? 0) + 1;
  }

  return ((papers ?? []) as {
    id: string;
    name: string;
    series: string | null;
    duration_minutes: number | null;
    is_active: boolean | null;
  }[]).map((p) => ({
    id: p.id,
    name: p.name,
    series: p.series ?? "",
    duration_minutes: p.duration_minutes ?? 0,
    question_count: counts[p.id] ?? 0,
    is_active: p.is_active ?? true,
  }));
}

export async function getAdminMockPaper(
  id: string
): Promise<(AdminMockPaper & { assignedIds: string[] }) | null> {
  if (!hasServiceRole) return null;
  const sb = createAdminClient();
  const { data: paper, error } = await sb
    .from("mock_exams")
    .select("id, name, series, duration_minutes, is_active")
    .eq("id", id)
    .maybeSingle();
  if (error || !paper) return null;

  const { data: links } = await sb
    .from("mock_exam_questions")
    .select("question_id, sort_order")
    .eq("mock_exam_id", id)
    .order("sort_order", { ascending: true });

  const assignedIds = ((links ?? []) as { question_id: string }[]).map(
    (r) => r.question_id
  );

  const p = paper as {
    id: string;
    name: string;
    series: string | null;
    duration_minutes: number | null;
    is_active: boolean | null;
  };

  return {
    id: p.id,
    name: p.name,
    series: p.series ?? "",
    duration_minutes: p.duration_minutes ?? 0,
    question_count: assignedIds.length,
    is_active: p.is_active ?? true,
    assignedIds,
  };
}

/** Lightweight question rows for the mock-paper picker. */
export type AdminPickerQuestion = {
  id: string;
  stem: string;
  section_name: string;
  difficulty: string;
};

function mapPickerRows(data: unknown): AdminPickerQuestion[] {
  return ((data ?? []) as unknown as {
    id: string;
    stem: string;
    difficulty: string | null;
    sections: { name: string } | null;
  }[]).map((q) => ({
    id: q.id,
    stem: q.stem,
    section_name: q.sections?.name ?? "Unassigned",
    difficulty: q.difficulty ?? "medium",
  }));
}

/**
 * Question bank rows for the mock-paper picker.
 * When `sectionId` is set, loads that section only. When omitted ("all"),
 * loads each section separately so a large import into one section cannot
 * crowd older sections out of a single newest-first window.
 */
export async function getAdminQuestionPickerRows(
  sectionId?: string | null
): Promise<AdminPickerQuestion[]> {
  if (!hasServiceRole) return [];
  const sb = createAdminClient();
  const select =
    "id, stem, difficulty, sections(name)" as const;

  if (sectionId) {
    const { data, error } = await sb
      .from("questions")
      .select(select)
      .eq("is_active", true)
      .eq("section_id", sectionId)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (error) {
      console.error("[admin question picker]:", error.message);
      return [];
    }
    return mapPickerRows(data);
  }

  const { data: sectionRows, error: sErr } = await sb
    .from("sections")
    .select("id")
    .eq("is_active", true);
  if (sErr) {
    console.error("[admin question picker] sections:", sErr.message);
    return [];
  }
  const ids = ((sectionRows ?? []) as { id: string }[]).map((s) => s.id);
  if (ids.length === 0) return [];

  const batches = await Promise.all(
    ids.map(async (id) => {
      const { data, error } = await sb
        .from("questions")
        .select(select)
        .eq("is_active", true)
        .eq("section_id", id)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) {
        console.error("[admin question picker]", id, error.message);
        return [];
      }
      return data ?? [];
    })
  );
  return mapPickerRows(batches.flat());
}

/** Resolve specific question ids (e.g. already assigned to a mock paper). */
export async function getAdminQuestionsByIds(
  ids: string[]
): Promise<AdminPickerQuestion[]> {
  if (!hasServiceRole || ids.length === 0) return [];
  const sb = createAdminClient();
  const unique = [...new Set(ids)];
  const chunkSize = 200;
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += chunkSize) {
    chunks.push(unique.slice(i, i + chunkSize));
  }
  const batches = await Promise.all(
    chunks.map(async (chunk) => {
      const { data, error } = await sb
        .from("questions")
        .select("id, stem, difficulty, sections(name)")
        .in("id", chunk);
      if (error) {
        console.error("[admin questions by ids]:", error.message);
        return [];
      }
      return data ?? [];
    })
  );
  return mapPickerRows(batches.flat());
}


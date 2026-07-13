// Client-side persistence for question sessions so save/resume works without a
// backend. Swap these for `attempts` / `attempt_answers` writes once Supabase
// is wired up — the runner only calls save/load/clear.

import type { Difficulty, RunnerMode, Question } from "./types";
import { formatDurationLabel } from "./session-utils";

export interface StoredSession {
  attemptId: string;
  mode: RunnerMode;
  mockName?: string;
  sectionName?: string;
  durationSeconds?: number;
  questionIds: string[];
  currentIndex: number;
  answers: Record<string, string>; // questionId -> optionId
  flags: string[]; // questionIds
  startedAt: number; // epoch ms
  submitted: boolean;
}

export interface DifficultyBreakdown {
  difficulty: Difficulty;
  total: number;
  correct: number;
  percent: number;
}

export interface StoredResult {
  attemptId: string;
  mode: RunnerMode;
  mockName?: string;
  sectionName?: string;
  studentName?: string;
  total: number;
  correct: number;
  answered: number;
  scorePercent: number;
  durationSeconds: number;
  byDifficulty: DifficultyBreakdown[];
  performanceNote: string;
  perQuestion: {
    questionId: string;
    stem: string;
    categoryName: string;
    difficulty: Difficulty;
    selectedOptionId?: string;
    correctOptionId: string;
    isCorrect: boolean;
    explanation: string;
  }[];
  completedAt: number;
}

/** Shared payload for the results card and PDF — keep in sync. */
export interface ResultsSummary {
  attemptId: string;
  studentName: string;
  sectionName: string;
  modeLabel: string;
  paperName?: string;
  scorePercent: number;
  correct: number;
  total: number;
  durationLabel: string;
  durationSeconds: number;
  byDifficulty: DifficultyBreakdown[];
  performanceNote: string;
  completedAt: number;
  completedAtLabel: string;
}

const sessionKey = (id: string) => `mp:runner:${id}`;
const resultKey = (id: string) => `mp:result:${id}`;
const avgKey = (section: string) => `mp:avg:${section.toLowerCase()}`;

export function saveSession(s: StoredSession) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(sessionKey(s.attemptId), JSON.stringify(s));
  } catch {
    /* storage full / unavailable — non-fatal */
  }
}

export function loadSession(id: string): StoredSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(sessionKey(id));
  return raw ? (JSON.parse(raw) as StoredSession) : null;
}

export function clearSession(id: string) {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(sessionKey(id));
}

export function saveResult(r: StoredResult) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(resultKey(r.attemptId), JSON.stringify(r));
  // Update rolling average for the performance note on future attempts.
  if (r.sectionName) {
    try {
      const prev = localStorage.getItem(avgKey(r.sectionName));
      const parsed = prev
        ? (JSON.parse(prev) as { sum: number; n: number })
        : { sum: 0, n: 0 };
      parsed.sum += r.scorePercent;
      parsed.n += 1;
      localStorage.setItem(avgKey(r.sectionName), JSON.stringify(parsed));
    } catch {
      /* ignore */
    }
  }
}

export function loadResult(id: string): StoredResult | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(resultKey(id));
  return raw ? (JSON.parse(raw) as StoredResult) : null;
}

function performanceNoteFor(
  sectionName: string | undefined,
  scorePercent: number
): string {
  if (typeof window === "undefined" || !sectionName) {
    return scorePercent >= 70
      ? "Solid result — keep practising to lock it in."
      : "Room to improve — review the missed questions below.";
  }
  try {
    const raw = localStorage.getItem(avgKey(sectionName));
    if (!raw) {
      return "First attempt in this section — great start.";
    }
    const { sum, n } = JSON.parse(raw) as { sum: number; n: number };
    // Called before saveResult updates the average — `sum/n` is prior history.
    if (n < 1) {
      return "First attempt in this section — great start.";
    }
    const priorAvg = sum / n;
    if (scorePercent > priorAvg + 5) {
      return `Above your average for ${sectionName} (${Math.round(priorAvg)}%).`;
    }
    if (scorePercent < priorAvg - 5) {
      return `Below your average for ${sectionName} (${Math.round(priorAvg)}%).`;
    }
    return `In line with your average for ${sectionName} (${Math.round(priorAvg)}%).`;
  } catch {
    return "Keep practising to build a reliable average.";
  }
}

/** Build a result object from the final session + question data. */
export function buildResult(
  session: StoredSession,
  questions: Question[],
  studentName?: string
): StoredResult {
  const perQuestion = questions.map((q) => {
    const selectedOptionId = session.answers[q.id];
    const correct = q.options.find((o) => o.is_correct)!;
    return {
      questionId: q.id,
      stem: q.stem,
      categoryName: q.category_name,
      difficulty: q.difficulty,
      selectedOptionId,
      correctOptionId: correct.id,
      isCorrect: selectedOptionId === correct.id,
      explanation: q.explanation,
    };
  });

  const answered = perQuestion.filter((p) => p.selectedOptionId).length;
  const correct = perQuestion.filter((p) => p.isCorrect).length;
  const total = questions.length;
  const scorePercent = total ? Math.round((correct / total) * 100) : 0;

  const sectionName =
    session.sectionName ??
    (questions[0]?.category_name &&
    questions.every((q) => q.category_name === questions[0].category_name)
      ? questions[0].category_name
      : "Mixed sections");

  const difficulties: Difficulty[] = ["easy", "medium", "hard"];
  const byDifficulty: DifficultyBreakdown[] = difficulties
    .map((d) => {
      const rows = perQuestion.filter((p) => p.difficulty === d);
      const c = rows.filter((p) => p.isCorrect).length;
      return {
        difficulty: d,
        total: rows.length,
        correct: c,
        percent: rows.length ? Math.round((c / rows.length) * 100) : 0,
      };
    })
    .filter((d) => d.total > 0);

  return {
    attemptId: session.attemptId,
    mode: session.mode,
    mockName: session.mockName,
    sectionName,
    studentName,
    total,
    correct,
    answered,
    scorePercent,
    durationSeconds: Math.round((Date.now() - session.startedAt) / 1000),
    byDifficulty,
    performanceNote: performanceNoteFor(sectionName, scorePercent),
    perQuestion,
    completedAt: Date.now(),
  };
}

export function toResultsSummary(
  result: StoredResult,
  studentName?: string
): ResultsSummary {
  const modeLabel =
    result.mode === "practice"
      ? "Practice"
      : result.mode === "timed"
        ? "Timed"
        : "Mock";
  const name = studentName || result.studentName || "Student";
  return {
    attemptId: result.attemptId,
    studentName: name,
    sectionName: result.sectionName ?? "Section",
    modeLabel,
    paperName: result.mode === "mock" ? result.mockName : undefined,
    scorePercent: result.scorePercent,
    correct: result.correct,
    total: result.total,
    durationLabel: formatDurationLabel(result.durationSeconds),
    durationSeconds: result.durationSeconds,
    byDifficulty: result.byDifficulty ?? [],
    performanceNote: result.performanceNote ?? "",
    completedAt: result.completedAt,
    completedAtLabel: new Date(result.completedAt).toLocaleString(),
  };
}

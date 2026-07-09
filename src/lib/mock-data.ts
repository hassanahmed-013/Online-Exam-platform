// Seed / mock data so the whole UI works with no backend.
// When Supabase is wired up, swap these reads for queries (see src/lib/data.ts).

import type {
  Category,
  CategoryPerformance,
  Exam,
  MockExam,
  Question,
  RecentSession,
  ReviewItem,
  ScorePoint,
} from "./types";

export const EXAM: Exam = {
  id: "exam-mdcat",
  name: "MDCAT",
  slug: "mdcat",
  description:
    "The complete Medical & Dental College Admission Test question bank — Biology, Chemistry, Physics, English and Logical Reasoning.",
  is_published: true,
};

export const EXAMS: Exam[] = [
  EXAM,
  {
    id: "exam-biology",
    name: "Biology",
    slug: "biology",
    description:
      "High-yield MDCAT Biology: cell biology, genetics, physiology and more.",
    is_published: true,
  },
  {
    id: "exam-chemistry",
    name: "Chemistry",
    slug: "chemistry",
    description:
      "Organic, inorganic and physical chemistry MCQs tuned to the MDCAT syllabus.",
    is_published: true,
  },
  {
    id: "exam-physics",
    name: "Physics",
    slug: "physics",
    description:
      "Mechanics, electromagnetism, waves and modern physics practice questions.",
    is_published: true,
  },
];

export const CATEGORIES: Category[] = [
  { id: "cat-cell", exam_id: EXAM.id, name: "Cell Biology", sort_order: 1, total: 692, attempted: 1 },
  { id: "cat-genetics", exam_id: EXAM.id, name: "Genetics & Variation", sort_order: 2, total: 418, attempted: 34 },
  { id: "cat-physio", exam_id: EXAM.id, name: "Human Physiology", sort_order: 3, total: 540, attempted: 88 },
  { id: "cat-biomol", exam_id: EXAM.id, name: "Biomolecules", sort_order: 4, total: 312, attempted: 12 },
  { id: "cat-orgchem", exam_id: EXAM.id, name: "Organic Chemistry", sort_order: 5, total: 604, attempted: 51 },
  { id: "cat-physchem", exam_id: EXAM.id, name: "Physical Chemistry", sort_order: 6, total: 388, attempted: 0 },
  { id: "cat-mechanics", exam_id: EXAM.id, name: "Mechanics", sort_order: 7, total: 466, attempted: 120 },
  { id: "cat-electro", exam_id: EXAM.id, name: "Electromagnetism", sort_order: 8, total: 402, attempted: 9 },
  { id: "cat-english", exam_id: EXAM.id, name: "English & Reasoning", sort_order: 9, total: 275, attempted: 40 },
];

function opt(id: string, text: string, correct = false, order = 0) {
  return { id, option_text: text, is_correct: correct, sort_order: order };
}

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    exam_id: EXAM.id,
    category_id: "cat-cell",
    category_name: "Cell Biology",
    stem: "Which organelle is the primary site of ATP synthesis in eukaryotic cells?",
    explanation:
      "The mitochondrion is the site of oxidative phosphorylation. The electron transport chain on the inner mitochondrial membrane creates a proton gradient that ATP synthase uses to generate the majority of a cell's ATP.",
    difficulty: "easy",
    is_demo: true,
    options: [
      opt("q1a", "Ribosome", false, 1),
      opt("q1b", "Mitochondrion", true, 2),
      opt("q1c", "Golgi apparatus", false, 3),
      opt("q1d", "Lysosome", false, 4),
    ],
  },
  {
    id: "q2",
    exam_id: EXAM.id,
    category_id: "cat-cell",
    category_name: "Cell Biology",
    stem: "The fluid mosaic model describes the structure of the:",
    explanation:
      "The fluid mosaic model (Singer & Nicolson, 1972) describes the plasma membrane as a fluid phospholipid bilayer with embedded proteins that can move laterally.",
    difficulty: "easy",
    is_demo: true,
    options: [
      opt("q2a", "Cell wall", false, 1),
      opt("q2b", "Nuclear envelope only", false, 2),
      opt("q2c", "Plasma membrane", true, 3),
      opt("q2d", "Cytoskeleton", false, 4),
    ],
  },
  {
    id: "q3",
    exam_id: EXAM.id,
    category_id: "cat-genetics",
    category_name: "Genetics & Variation",
    stem: "In a monohybrid cross between two heterozygotes (Aa × Aa), what is the expected phenotypic ratio?",
    explanation:
      "A cross of Aa × Aa yields genotypes 1 AA : 2 Aa : 1 aa. Since A is dominant, the phenotypic ratio is 3 dominant : 1 recessive.",
    difficulty: "medium",
    is_demo: true,
    options: [
      opt("q3a", "1 : 1", false, 1),
      opt("q3b", "3 : 1", true, 2),
      opt("q3c", "9 : 3 : 3 : 1", false, 3),
      opt("q3d", "1 : 2 : 1", false, 4),
    ],
  },
  {
    id: "q4",
    exam_id: EXAM.id,
    category_id: "cat-physio",
    category_name: "Human Physiology",
    stem: "Which part of the nephron is primarily responsible for the reabsorption of glucose?",
    explanation:
      "Glucose is reabsorbed almost entirely in the proximal convoluted tubule via sodium-glucose co-transporters (SGLT). Under normal conditions no glucose appears in the urine.",
    difficulty: "medium",
    is_demo: true,
    options: [
      opt("q4a", "Proximal convoluted tubule", true, 1),
      opt("q4b", "Loop of Henle", false, 2),
      opt("q4c", "Distal convoluted tubule", false, 3),
      opt("q4d", "Collecting duct", false, 4),
    ],
  },
  {
    id: "q5",
    exam_id: EXAM.id,
    category_id: "cat-orgchem",
    category_name: "Organic Chemistry",
    stem: "Which functional group is characteristic of a carboxylic acid?",
    explanation:
      "A carboxylic acid contains the carboxyl group (–COOH), a carbonyl (C=O) bonded to a hydroxyl (–OH) on the same carbon.",
    difficulty: "easy",
    is_demo: true,
    options: [
      opt("q5a", "–OH only", false, 1),
      opt("q5b", "–CHO", false, 2),
      opt("q5c", "–COOH", true, 3),
      opt("q5d", "–NH2", false, 4),
    ],
  },
  {
    id: "q6",
    exam_id: EXAM.id,
    category_id: "cat-mechanics",
    category_name: "Mechanics",
    stem: "A body moving with uniform velocity has:",
    explanation:
      "Uniform velocity means constant speed in a straight line, so acceleration is zero and, by Newton's first law, the net force is zero.",
    difficulty: "easy",
    is_demo: true,
    options: [
      opt("q6a", "Zero acceleration", true, 1),
      opt("q6b", "Increasing momentum", false, 2),
      opt("q6c", "A net non-zero force", false, 3),
      opt("q6d", "Decreasing kinetic energy", false, 4),
    ],
  },
  {
    id: "q7",
    exam_id: EXAM.id,
    category_id: "cat-electro",
    category_name: "Electromagnetism",
    stem: "The SI unit of electric charge is the:",
    explanation:
      "The coulomb (C) is the SI unit of electric charge. One coulomb is the charge transported by a constant current of one ampere in one second.",
    difficulty: "easy",
    is_demo: false,
    options: [
      opt("q7a", "Volt", false, 1),
      opt("q7b", "Ampere", false, 2),
      opt("q7c", "Coulomb", true, 3),
      opt("q7d", "Ohm", false, 4),
    ],
  },
  {
    id: "q8",
    exam_id: EXAM.id,
    category_id: "cat-biomol",
    category_name: "Biomolecules",
    stem: "The monomer unit of a protein is a(n):",
    explanation:
      "Proteins are polymers of amino acids linked by peptide bonds. Each amino acid has an amino group, a carboxyl group and a variable R group.",
    difficulty: "easy",
    is_demo: false,
    options: [
      opt("q8a", "Nucleotide", false, 1),
      opt("q8b", "Amino acid", true, 2),
      opt("q8c", "Monosaccharide", false, 3),
      opt("q8d", "Fatty acid", false, 4),
    ],
  },
  {
    id: "q9",
    exam_id: EXAM.id,
    category_id: "cat-orgchem",
    category_name: "Organic Chemistry",
    stem: "Which of the following is an example of an SN1 reaction favouring substrate?",
    explanation:
      "SN1 reactions proceed via a carbocation intermediate, so they are fastest with tertiary substrates where the carbocation is most stabilised by hyperconjugation and induction.",
    difficulty: "hard",
    is_demo: false,
    options: [
      opt("q9a", "Primary alkyl halide", false, 1),
      opt("q9b", "Methyl halide", false, 2),
      opt("q9c", "Tertiary alkyl halide", true, 3),
      opt("q9d", "Vinyl halide", false, 4),
    ],
  },
  {
    id: "q10",
    exam_id: EXAM.id,
    category_id: "cat-english",
    category_name: "English & Reasoning",
    stem: "Choose the word most nearly OPPOSITE in meaning to 'benevolent'.",
    explanation:
      "'Benevolent' means kind and well-meaning. Its antonym is 'malevolent', meaning wishing harm to others.",
    difficulty: "medium",
    is_demo: false,
    options: [
      opt("q10a", "Generous", false, 1),
      opt("q10b", "Malevolent", true, 2),
      opt("q10c", "Compassionate", false, 3),
      opt("q10d", "Cordial", false, 4),
    ],
  },
];

export const MOCK_EXAMS: MockExam[] = [
  { id: "mock-a1", exam_id: EXAM.id, name: "Mock Exam A — Paper 1", question_count: 100, duration_minutes: 180, group: "Mock Exam A" },
  { id: "mock-a2", exam_id: EXAM.id, name: "Mock Exam A — Paper 2", question_count: 100, duration_minutes: 180, group: "Mock Exam A" },
  { id: "mock-b1", exam_id: EXAM.id, name: "Mock Exam B — Paper 1", question_count: 200, duration_minutes: 210, group: "Mock Exam B" },
  { id: "mock-b2", exam_id: EXAM.id, name: "Mock Exam B — Paper 2", question_count: 200, duration_minutes: 210, group: "Mock Exam B" },
  { id: "mock-c1", exam_id: EXAM.id, name: "Mock Exam C — Full Simulation", question_count: 200, duration_minutes: 210, group: "Mock Exam C" },
];

export const RECENT_SESSIONS: RecentSession[] = [
  { id: "s1", mode: "practice", categoryName: "Mechanics", answered: 12, total: 20, updatedAt: "2026-07-09T14:12:00Z" },
  { id: "s2", mode: "timed", categoryName: "Organic Chemistry", answered: 20, total: 20, updatedAt: "2026-07-08T09:40:00Z" },
  { id: "s3", mode: "practice", categoryName: "Human Physiology", answered: 5, total: 15, updatedAt: "2026-07-07T19:05:00Z" },
];

export const REVIEW_ITEMS: ReviewItem[] = QUESTIONS.slice(0, 6).map((q, i) => ({
  id: `rev-${q.id}`,
  questionId: q.id,
  title: q.stem.slice(0, 60) + (q.stem.length > 60 ? "…" : ""),
  snippet: q.explanation.slice(0, 120) + "…",
  categoryName: q.category_name,
  answeredAt: new Date(Date.now() - i * 86400000).toISOString(),
  vote: i % 3 === 0 ? "up" : i % 3 === 1 ? "down" : undefined,
  isCorrect: i % 2 === 0,
}));

export const CATEGORY_PERFORMANCE: CategoryPerformance[] = [
  { category: "Mechanics", accuracy: 82, answered: 120 },
  { category: "Human Physiology", accuracy: 74, answered: 88 },
  { category: "Organic Chem", accuracy: 61, answered: 51 },
  { category: "English & Reasoning", accuracy: 70, answered: 40 },
  { category: "Genetics", accuracy: 55, answered: 34 },
  { category: "Biomolecules", accuracy: 48, answered: 12 },
  { category: "Electromagnetism", accuracy: 40, answered: 9 },
];

export const SCORE_HISTORY: ScorePoint[] = [
  { date: "Feb", score: 42 },
  { date: "Mar", score: 51 },
  { date: "Apr", score: 58 },
  { date: "May", score: 63 },
  { date: "Jun", score: 69 },
  { date: "Jul", score: 74 },
];

export const DASHBOARD_STATS = {
  examDate: "2026-09-14",
  streakDays: 6,
  sessions: 24,
  averageScore: 68,
  answered: 465,
  totalQuestions: CATEGORIES.reduce((s, c) => s + c.total, 0),
};

// Types shared between the bulk-import client UI and the /api/admin/import
// route handler. No server-only imports here so the client can use it too.

export interface ImportRowInput {
  /** 1-based CSV line number (header = 1), for error reporting. */
  line: number;
  data: Record<string, string>;
}

export type RowStatus =
  | "valid" // passed validation (dry run)
  | "error" // blocking validation failure
  | "duplicate" // already in the bank (idempotency guard)
  | "imported" // inserted this run
  | "failed"; // insert/image error at commit time

export interface RowResult {
  line: number;
  status: RowStatus;
  messages?: string[];
}

export interface ImportRequest {
  rows: ImportRowInput[];
  commit: boolean;
  /** When set, every row is assigned to this section and `section_name` is not required. */
  section_id?: string;
  /**
   * Generic import only: when true, create a new section for any unknown
   * section_name instead of rejecting the row. Default false.
   */
  auto_create_sections?: boolean;
}

export interface ImportResponse {
  results: RowResult[];
  error?: string;
}

export const OPTION_LETTERS = ["a", "b", "c", "d", "e", "f"] as const;

/** Official section bulk-import template (creates new question content). */
export const IMPORT_TEMPLATE = `section_name,question_text,option_a,option_b,option_c,option_d,option_e,correct_option,explanation,image_url,difficulty
Biology,"Which organelle is responsible for ATP production?","Nucleus","Mitochondria","Ribosome","Golgi apparatus","Lysosome",b,"Mitochondria generate ATP through oxidative phosphorylation.",,medium
Biology,"What is the basic structural unit of the nervous system?","Neuron","Nephron","Osteon","Sarcomere",,a,"The neuron is the fundamental cell of the nervous system.",,easy
Chemistry,"Which gas is produced when a metal reacts with a dilute acid?","Oxygen","Hydrogen","Nitrogen","Carbon dioxide",,b,"Metals reacting with dilute acids typically release hydrogen gas.",https://example.com/reaction.jpg,easy`;

/** Template when importing into a pre-selected section (`?section_id=`). */
export const SECTION_SCOPED_IMPORT_TEMPLATE = `question_text,option_a,option_b,option_c,option_d,option_e,correct_option,explanation,image_url,difficulty
"Which organelle is responsible for ATP production?","Nucleus","Mitochondria","Ribosome","Golgi apparatus","Lysosome",b,"Mitochondria generate ATP through oxidative phosphorylation.",,medium
"What is the basic structural unit of the nervous system?","Neuron","Nephron","Osteon","Sarcomere",,a,"The neuron is the fundamental cell of the nervous system.",,easy`;

/**
 * Official mock-paper assignment template.
 * question_id = import external_id (e.g. MRCP-Q-001) or bank UUID.
 */
export const MOCK_ASSIGN_TEMPLATE = `question_id,sort_order
MRCP-Q-001,1
MRCP-Q-002,2
MRCP-Q-003,3`;

/** Alternate mock-paper assignment template (exact question_text match). */
export const MOCK_ASSIGN_BY_TEXT_TEMPLATE = `question_text,sort_order
"Which organelle is responsible for ATP production?",1
"What is the basic structural unit of the nervous system?",2`;

/** Strip a UTF-8 BOM that Excel often prepends to the first header cell. */
export function stripBom(value: string): string {
  return value.replace(/^\uFEFF/, "");
}

/** Normalize a CSV header name (BOM + trim). */
export function normalizeHeader(header: string): string {
  return stripBom(header).trim();
}

/**
 * Normalize every key/value in a parsed CSV row: BOM-safe headers + trimmed cells.
 * Empty / nullish values become "".
 */
export function normalizeCsvRow(
  data: Record<string, unknown>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [rawKey, rawVal] of Object.entries(data)) {
    const key = normalizeHeader(rawKey);
    if (!key) continue;
    const val =
      rawVal == null ? "" : typeof rawVal === "string" ? rawVal : String(rawVal);
    out[key] = stripBom(val).trim();
  }
  return out;
}

/** PapaParse `transformHeader` — strips BOM and whitespace from column names. */
export function transformCsvHeader(header: string): string {
  return normalizeHeader(header);
}

/**
 * File-level header check for section bulk import.
 * Returns a single clear message, or null if headers look fine.
 */
export function validateImportHeaders(
  fields: string[] | undefined,
  scoped: boolean
): string | null {
  const found = (fields ?? []).map(normalizeHeader).filter(Boolean);
  const required = scoped
    ? (["question_text", "correct_option"] as const)
    : (["section_name", "question_text", "correct_option"] as const);

  for (const col of required) {
    if (!found.includes(col)) {
      return `Column '${col}' not found in your CSV header. Found columns: ${
        found.length ? found.join(", ") : "(none)"
      }`;
    }
  }

  const hasOption = OPTION_LETTERS.some((l) => found.includes(`option_${l}`));
  if (!hasOption) {
    return `No option columns found (expected option_a, option_b, …). Found columns: ${found.join(", ")}`;
  }

  return null;
}

/**
 * File-level header check for mock-paper assignment CSV.
 * Needs question_id (UUID or external_id) and/or question_text.
 */
export function validateMockAssignHeaders(
  fields: string[] | undefined
): string | null {
  const found = (fields ?? []).map(normalizeHeader).filter(Boolean);
  const hasId = found.includes("question_id");
  const hasText = found.includes("question_text");
  if (!hasId && !hasText) {
    return `Column 'question_id' or 'question_text' not found in your CSV header. Found columns: ${
      found.length ? found.join(", ") : "(none)"
    }`;
  }
  return null;
}

/** Extract the non-empty options from a row, in letter order. */
export function optionsFromRow(
  data: Record<string, string>
): { letter: string; text: string }[] {
  return OPTION_LETTERS.map((l) => ({
    letter: l,
    text: (data[`option_${l}`] ?? "").trim(),
  })).filter((o) => o.text.length > 0);
}

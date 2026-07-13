import { NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";
import {
  optionsFromRow,
  normalizeCsvRow,
  type ImportRequest,
  type ImportResponse,
  type RowResult,
} from "@/lib/import-shared";

export const runtime = "nodejs";

const DIFFICULTIES = ["easy", "medium", "hard"];

/** Placeholder cover for sections auto-created during bulk import. */
function placeholderCover(name: string) {
  const label = name.replace(/[<>&"']/g, "").slice(0, 40);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0d9488"/><stop offset="1" stop-color="#115e59"/></linearGradient></defs><rect width="800" height="400" fill="url(#g)"/><text x="48" y="220" fill="white" font-size="42" font-family="system-ui,sans-serif">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface Parsed {
  line: number;
  section_id?: string;
  question_text: string;
  options: { letter: string; text: string }[];
  correctText?: string;
  explanation: string;
  difficulty: string;
  image_url?: string;
  external_id?: string;
  content_hash: string;
  errors: string[];
}

function contentHash(sectionId: string, stem: string, opts: string[]) {
  return createHash("sha256")
    .update(`${sectionId}||${stem.trim().toLowerCase()}||${opts.map((o) => o.trim().toLowerCase()).join("|")}`)
    .digest("hex");
}

/** Run async work with a small concurrency cap (for image downloads). */
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    })
  );
  return out;
}

export async function POST(request: Request): Promise<NextResponse<ImportResponse>> {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { results: [], error: gate.error },
      { status: gate.error.includes("Sign in") || gate.error.includes("Admin") ? 403 : 400 }
    );
  }
  if (!hasServiceRole) {
    return NextResponse.json(
      { results: [], error: "SUPABASE_SERVICE_ROLE_KEY is not set." },
      { status: 400 }
    );
  }

  let body: ImportRequest;
  try {
    body = (await request.json()) as ImportRequest;
  } catch {
    return NextResponse.json({ results: [], error: "Invalid JSON body." }, { status: 400 });
  }
  const { rows, commit, section_id: rawLockedSectionId, auto_create_sections } =
    body;
  const lockedSectionId =
    rawLockedSectionId?.trim().replace(/\/+$/, "") || undefined;
  const autoCreateSections =
    Boolean(auto_create_sections) && !lockedSectionId;
  if (!Array.isArray(rows)) {
    return NextResponse.json(
      { results: [], error: "rows must be an array." },
      { status: 400 }
    );
  }

  const sb = createAdminClient();

  // Resolve section names → ids (match any section, active or not).
  const { data: sectionRows } = await sb
    .from("sections")
    .select("id,name,is_active");
  const sectionByName = new Map(
    (sectionRows ?? []).map((s: { id: string; name: string }) => [
      s.name.trim().toLowerCase(),
      s.id,
    ])
  );
  const sectionById = new Map(
    (sectionRows ?? []).map((s: { id: string; name: string }) => [s.id, s.name])
  );

  // Pre-selected section (from /admin/bulk-import?section_id=…) — skip section_name column.
  if (lockedSectionId && !sectionById.has(lockedSectionId)) {
    return NextResponse.json(
      { results: [], error: "That section does not exist." },
      { status: 400 }
    );
  }

  // Opt-in: create missing sections from the CSV's section_name column.
  if (autoCreateSections) {
    const needed = new Set<string>();
    for (const { data: raw } of rows) {
      const data = normalizeCsvRow(raw);
      const name = (data.section_name ?? "").trim();
      if (name && !sectionByName.has(name.toLowerCase())) {
        needed.add(name);
      }
    }
    if (needed.size && commit) {
      for (const name of needed) {
        const cover = placeholderCover(name);
        const { data: created, error: cErr } = await sb
          .from("sections")
          .insert({
            name,
            short_description:
              "Auto-created from bulk import — add a description and cover under Admin → Sections.",
            cover_image_url: cover,
            is_active: true,
          })
          .select("id,name")
          .single();
        if (cErr || !created) {
          return NextResponse.json(
            {
              results: [],
              error: `Could not auto-create section "${name}": ${cErr?.message ?? "unknown error"}`,
            },
            { status: 400 }
          );
        }
        sectionByName.set(created.name.trim().toLowerCase(), created.id);
        sectionById.set(created.id, created.name);
      }
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/admin/sections");
      revalidatePath("/");
      revalidatePath("/categories");
      revalidatePath("/dashboard/question-bank");
    } else if (needed.size && !commit) {
      // Dry-run: reserve stable placeholder ids so rows validate & hash.
      for (const name of needed) {
        sectionByName.set(name.toLowerCase(), `pending:${name.toLowerCase()}`);
      }
    }
  }

  // --- Parse + validate every row ---
  const parsed: Parsed[] = rows.map(({ line, data: raw }) => {
    const data = normalizeCsvRow(raw);
    const errors: string[] = [];
    let section_id: string | undefined;

    if (lockedSectionId) {
      section_id = lockedSectionId;
    } else {
      const sectionName = (data.section_name ?? "").trim();
      section_id = sectionByName.get(sectionName.toLowerCase());
      if (!sectionName) {
        errors.push(
          'Blank "section_name" cell — fill in an existing section name (create the section first if needed)'
        );
      } else if (!section_id) {
        errors.push(
          autoCreateSections
            ? `Section "${sectionName}" could not be resolved`
            : `Section "${sectionName}" does not exist — create it under Admin → Sections first, or enable “Auto-create missing sections”`
        );
      }
    }

    if (commit && section_id?.startsWith("pending:")) {
      errors.push("Section was not created — enable auto-create and try again");
      section_id = undefined;
    }

    const question_text = (data.question_text ?? "").trim();
    if (!question_text) errors.push('Blank "question_text" cell');

    const options = optionsFromRow(data);
    if (options.length < 2) errors.push("At least two options are required");

    const correctLetter = (data.correct_option ?? "").trim().toLowerCase();
    const correct = options.find((o) => o.letter === correctLetter);
    if (!correctLetter) errors.push('Blank "correct_option" cell');
    else if (!correct) {
      errors.push(
        `correct_option "${data.correct_option}" has no matching option`
      );
    }

    let difficulty = (data.difficulty ?? "").trim().toLowerCase();
    if (difficulty && !DIFFICULTIES.includes(difficulty)) {
      errors.push(`difficulty must be one of ${DIFFICULTIES.join(", ")}`);
      difficulty = "medium";
    }
    if (!difficulty) difficulty = "medium";

    return {
      line,
      section_id,
      question_text,
      options,
      correctText: correct?.text,
      explanation: (data.explanation ?? "").trim(),
      difficulty,
      image_url: (data.image_url ?? "").trim() || undefined,
      external_id:
        (data.external_id ?? "").trim() ||
        (data.question_id ?? "").trim() ||
        undefined,
      content_hash: section_id
        ? contentHash(
            section_id,
            question_text,
            options.map((o) => o.text)
          )
        : "",
      errors,
    };
  });

  const results: RowResult[] = [];
  const valid = parsed.filter((p) => p.errors.length === 0);
  for (const p of parsed) {
    if (p.errors.length) results.push({ line: p.line, status: "error", messages: p.errors });
  }

  // --- Idempotency: which rows already exist in the DB? ---
  const hashes = valid.map((p) => p.content_hash);
  const existingHashes = new Set<string>();
  // section_id::external_id — uniqueness is per section after migration 0006
  const existingExtKeys = new Set<string>();
  if (hashes.length) {
    const { data } = await sb.from("questions").select("content_hash").in("content_hash", hashes);
    (data ?? []).forEach((r: { content_hash: string | null }) => r.content_hash && existingHashes.add(r.content_hash));
  }
  const extIds = valid.map((p) => p.external_id).filter(Boolean) as string[];
  if (extIds.length) {
    const { data } = await sb
      .from("questions")
      .select("section_id,external_id")
      .in("external_id", extIds);
    (data ?? []).forEach((r: { section_id: string | null; external_id: string | null }) => {
      if (r.external_id && r.section_id) {
        existingExtKeys.add(`${r.section_id}::${r.external_id}`);
      }
    });
  }
  // Also guard against duplicates within the same upload batch.
  const seenHash = new Set<string>();
  const seenExtKey = new Set<string>();

  const toInsert: Parsed[] = [];
  for (const p of valid) {
    const extKey =
      p.external_id && p.section_id ? `${p.section_id}::${p.external_id}` : null;
    const dupInDb =
      existingHashes.has(p.content_hash) ||
      (extKey != null && existingExtKeys.has(extKey));
    const dupInBatch =
      seenHash.has(p.content_hash) ||
      (extKey != null && seenExtKey.has(extKey));
    if (dupInDb || dupInBatch) {
      results.push({ line: p.line, status: "duplicate", messages: ["Already in the question bank"] });
      continue;
    }
    seenHash.add(p.content_hash);
    if (extKey) seenExtKey.add(extKey);
    if (!commit) results.push({ line: p.line, status: "valid" });
    else toInsert.push(p);
  }

  if (!commit) return NextResponse.json({ results });

  // --- Commit: rehost images, then batch-insert questions + options ---
  const withImages = await mapLimit(toInsert, 5, async (p) => {
    if (!p.image_url) return { p, finalUrl: undefined as string | undefined, failed: false };
    try {
      const res = await fetch(p.image_url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      const ext = (p.image_url.split(".").pop() || "png").split(/[?#]/)[0].slice(0, 5);
      const path = `${randomUUID()}.${ext}`;
      const { error } = await sb.storage
        .from("question-images")
        .upload(path, buf, { contentType: res.headers.get("content-type") || "image/png" });
      if (error) throw new Error(error.message);
      return { p, finalUrl: sb.storage.from("question-images").getPublicUrl(path).data.publicUrl, failed: false };
    } catch (e) {
      results.push({ line: p.line, status: "failed", messages: [`Image fetch/upload failed: ${(e as Error).message}`] });
      return { p, finalUrl: undefined, failed: true };
    }
  });

  const insertable = withImages.filter((w) => !w.failed);
  if (insertable.length === 0) return NextResponse.json({ results });

  // Generate ids up front so options can reference their question.
  const questionRows = insertable.map(({ p, finalUrl }) => ({
    id: randomUUID(),
    section_id: p.section_id,
    stem: p.question_text,
    explanation: p.explanation || null,
    difficulty: p.difficulty,
    is_demo: false,
    is_active: true,
    image_url: finalUrl ?? null,
    image_source: finalUrl ? "bulk_import" : null,
    original_source_url: p.image_url ?? null,
    external_id: p.external_id ?? null,
    content_hash: p.content_hash,
  }));

  // Plain insert — duplicates are already filtered above. Avoid upsert on
  // content_hash: the DB only has a *partial* unique index, which PostgREST
  // cannot target with ON CONFLICT, causing the whole batch to fail.
  const { data: inserted, error: qErr } = await sb
    .from("questions")
    .insert(questionRows)
    .select("id,content_hash");

  if (qErr) {
    insertable.forEach(({ p }) =>
      results.push({
        line: p.line,
        status: "failed",
        messages: [`Insert failed: ${qErr.message}`],
      })
    );
    return NextResponse.json({ results });
  }

  const insertedByHash = new Map(
    (inserted ?? []).map((r: { id: string; content_hash: string }) => [
      r.content_hash,
      r.id,
    ])
  );

  // Build options only for questions that actually inserted.
  const optionRows: {
    question_id: string;
    option_text: string;
    is_correct: boolean;
    sort_order: number;
  }[] = [];
  for (const { p } of insertable) {
    const questionId = insertedByHash.get(p.content_hash);
    if (!questionId) {
      results.push({
        line: p.line,
        status: "failed",
        messages: ["Insert did not return this row — try again"],
      });
      continue;
    }
    p.options.forEach((o, i) =>
      optionRows.push({
        question_id: questionId,
        option_text: o.text,
        is_correct: o.text === p.correctText,
        sort_order: i + 1,
      })
    );
    results.push({ line: p.line, status: "imported" });
  }

  if (optionRows.length) {
    const { error: oErr } = await sb.from("question_options").insert(optionRows);
    if (oErr) {
      return NextResponse.json({
        results,
        error: `Questions inserted but options failed: ${oErr.message}`,
      });
    }
  }

  return NextResponse.json({ results });
}

// Public read access for sections (the live section cards).
// When Supabase is configured, returns real rows only — never mock/seed data.
// Empty array is a valid state (admin hasn't created sections yet).

import { createReadClient, isSupabaseConfigured } from "./supabase/read";
import type { Category, Section } from "./types";

function tallyBySection(rows: { section_id: string | null }[]) {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    if (r.section_id) counts[r.section_id] = (counts[r.section_id] ?? 0) + 1;
  }
  return counts;
}

/** Map a live section into the Category shape used by existing cards/panels. */
export function sectionAsCategory(s: Section): Category {
  return {
    id: s.id,
    exam_id: "",
    slug: s.id,
    name: s.name,
    short_description: s.short_description,
    cover_image_url: s.cover_image_url,
    sort_order: 0,
    total: s.question_count ?? 0,
    attempted: 0,
  };
}

export async function getSections(): Promise<Section[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const sb = createReadClient();
    const [{ data: sections, error }, { data: qs }] = await Promise.all([
      sb
        .from("sections")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      sb.from("questions").select("section_id").eq("is_active", true),
    ]);
    if (error) return [];
    const counts = tallyBySection((qs ?? []) as { section_id: string | null }[]);
    return ((sections ?? []) as Section[]).map((s) => ({
      ...s,
      question_count: counts[s.id] ?? 0,
    }));
  } catch {
    return [];
  }
}

export async function getSectionById(id: string): Promise<Section | undefined> {
  if (!isSupabaseConfigured) return undefined;
  try {
    const sb = createReadClient();
    const [{ data, error }, { count }] = await Promise.all([
      sb.from("sections").select("*").eq("id", id).maybeSingle(),
      sb
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("section_id", id)
        .eq("is_active", true),
    ]);
    if (error || !data) return undefined;
    return { ...(data as Section), question_count: count ?? 0 };
  } catch {
    return undefined;
  }
}

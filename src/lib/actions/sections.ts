"use server";

// Section CRUD — privileged writes via the service-role client. Called from the
// admin section manager (client component). Every mutation revalidates the
// surfaces that render section cards so new sections appear immediately.
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

async function uploadCover(
  sb: ReturnType<typeof createAdminClient>,
  file: File
): Promise<string> {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await sb.storage
    .from("section-images")
    .upload(path, bytes, { contentType: file.type || "image/png", upsert: false });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  return sb.storage.from("section-images").getPublicUrl(path).data.publicUrl;
}

function revalidateSectionSurfaces() {
  revalidatePath("/admin/sections");
  revalidatePath("/admin/bulk-import");
  revalidatePath("/admin/exams");
  revalidatePath("/");
  revalidatePath("/categories");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/question-bank");
  revalidatePath("/dashboard/exams");
}

export async function createSection(formData: FormData): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };
  const name = String(formData.get("name") ?? "").trim();
  const short_description = String(formData.get("short_description") ?? "").trim();
  const cover = formData.get("cover");
  if (!name) return { ok: false, error: "Name is required." };
  if (!short_description) return { ok: false, error: "Short description is required." };
  if (!(cover instanceof File) || cover.size === 0) {
    return { ok: false, error: "A cover image is required." };
  }

  try {
    const sb = createAdminClient();
    const cover_image_url = await uploadCover(sb, cover);
    const { data, error } = await sb
      .from("sections")
      .insert({ name, short_description, cover_image_url })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidateSectionSurfaces();
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateSection(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };
  const name = String(formData.get("name") ?? "").trim();
  const short_description = String(formData.get("short_description") ?? "").trim();
  const cover = formData.get("cover");
  if (!name) return { ok: false, error: "Name is required." };
  if (!short_description) return { ok: false, error: "Short description is required." };

  try {
    const sb = createAdminClient();
    const patch: Record<string, unknown> = { name, short_description };
    if (cover instanceof File && cover.size > 0) {
      patch.cover_image_url = await uploadCover(sb, cover);
    }
    const { error } = await sb.from("sections").update(patch).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidateSectionSurfaces();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Delete a section. If it still has questions we soft-delete (is_active =
 * false) so the question data survives; an empty section is hard-deleted.
 */
export async function deleteSection(id: string): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };
  try {
    const sb = createAdminClient();
    const { count } = await sb
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("section_id", id);

    if (count && count > 0) {
      const { error } = await sb
        .from("sections")
        .update({ is_active: false })
        .eq("id", id);
      if (error) return { ok: false, error: error.message };
      revalidateSectionSurfaces();
      return {
        ok: true,
        error: `Section has ${count} question(s) — hidden from students (soft-deleted), data kept.`,
      };
    }

    const { error } = await sb.from("sections").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidateSectionSurfaces();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

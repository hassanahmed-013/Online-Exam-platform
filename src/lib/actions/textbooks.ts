"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-auth";

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);

const MAX_BYTES = 25 * 1024 * 1024; // 25MB

function revalidateTextbookSurfaces() {
  revalidatePath("/admin/textbooks");
  revalidatePath("/dashboard/textbooks");
  revalidatePath("/dashboard");
}

async function uploadFile(
  sb: ReturnType<typeof createAdminClient>,
  file: File
): Promise<{ url: string; path: string }> {
  const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await sb.storage.from("textbooks").upload(path, bytes, {
    contentType: file.type || "application/pdf",
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return {
    path,
    url: sb.storage.from("textbooks").getPublicUrl(path).data.publicUrl,
  };
}

export async function createTextbook(formData: FormData): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const tag = String(formData.get("tag") ?? "High-yield").trim() || "High-yield";
  const file = formData.get("file");

  if (!title) return { ok: false, error: "Title is required." };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "A document file is required." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File must be 25MB or smaller." };
  }
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return {
      ok: false,
      error: "Use PDF, Word, PowerPoint, or plain text.",
    };
  }

  try {
    const sb = createAdminClient();
    const uploaded = await uploadFile(sb, file);
    const { data, error } = await sb
      .from("textbooks")
      .insert({
        title,
        description,
        tag,
        file_url: uploaded.url,
        file_name: file.name,
        file_type: file.type || "application/pdf",
        file_size: file.size,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidateTextbookSurfaces();
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateTextbook(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const tag = String(formData.get("tag") ?? "High-yield").trim() || "High-yield";
  const file = formData.get("file");

  if (!title) return { ok: false, error: "Title is required." };

  try {
    const sb = createAdminClient();
    const patch: Record<string, unknown> = { title, description, tag };

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_BYTES) {
        return { ok: false, error: "File must be 25MB or smaller." };
      }
      if (file.type && !ALLOWED_TYPES.has(file.type)) {
        return {
          ok: false,
          error: "Use PDF, Word, PowerPoint, or plain text.",
        };
      }
      const uploaded = await uploadFile(sb, file);
      patch.file_url = uploaded.url;
      patch.file_name = file.name;
      patch.file_type = file.type || "application/pdf";
      patch.file_size = file.size;
    }

    const { error } = await sb.from("textbooks").update(patch).eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidateTextbookSurfaces();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteTextbook(id: string): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };
  try {
    const sb = createAdminClient();
    const { error } = await sb.from("textbooks").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidateTextbookSurfaces();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function setTextbookActive(
  id: string,
  is_active: boolean
): Promise<ActionResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };
  try {
    const sb = createAdminClient();
    const { error } = await sb
      .from("textbooks")
      .update({ is_active })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidateTextbookSurfaces();
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

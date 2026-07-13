"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface ProfileActionResult {
  ok: boolean;
  error?: string;
  avatar_url?: string;
}

export async function uploadAvatar(
  formData: FormData
): Promise<ProfileActionResult> {
  const user = await getCurrentUser();
  if (!user || user.id === "demo") {
    return { ok: false, error: "Sign in to upload an avatar." };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image file." };
  }
  if (!ALLOWED.has(file.type)) {
    return { ok: false, error: "Use a JPG, PNG, or WebP image." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Image must be 2MB or smaller." };
  }

  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/avatar.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    // Prefer the signed-in client so storage RLS applies; fall back to service role.
    const sb = hasServiceRole ? createAdminClient() : await createClient();
    const { error: upErr } = await sb.storage
      .from("avatars")
      .upload(path, bytes, {
        contentType: file.type,
        upsert: true,
      });
    if (upErr) return { ok: false, error: upErr.message };

    const {
      data: { publicUrl },
    } = sb.storage.from("avatars").getPublicUrl(path);
    // Cache-bust so the header updates immediately.
    const avatar_url = `${publicUrl}?v=${Date.now()}`;

    const { error: pErr } = await sb
      .from("profiles")
      .update({ avatar_url })
      .eq("id", user.id);
    if (pErr) return { ok: false, error: pErr.message };

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    return { ok: true, avatar_url };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateProfileName(
  formData: FormData
): Promise<ProfileActionResult> {
  const user = await getCurrentUser();
  if (!user || user.id === "demo") {
    return { ok: false, error: "Sign in to update your profile." };
  }
  const full_name = String(formData.get("full_name") ?? "").trim();
  if (!full_name) return { ok: false, error: "Name is required." };

  try {
    const sb = hasServiceRole ? createAdminClient() : await createClient();
    const { error } = await sb
      .from("profiles")
      .update({ full_name })
      .eq("id", user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

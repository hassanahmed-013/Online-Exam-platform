"use server";

import { randomUUID } from "crypto";
import { createAdminClient, hasServiceRole } from "@/lib/supabase/admin";

/** Record a guest demo start so Demo → signup analytics can compute. */
export async function trackDemoSession(questionIds: string[] = []): Promise<void> {
  if (!hasServiceRole) return;
  try {
    const sb = createAdminClient();
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);
    await sb.from("demo_sessions").upsert({
      token: randomUUID(),
      question_ids: questionIds.slice(0, 50),
      expires_at: expires.toISOString(),
    });
  } catch (e) {
    console.error("[trackDemoSession]", e);
  }
}

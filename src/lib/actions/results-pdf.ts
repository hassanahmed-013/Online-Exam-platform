"use server";

import {
  buildResultsPdf,
  pdfBytesToBase64,
} from "@/lib/results-pdf";
import { getServerResultsSummary } from "@/lib/actions/attempts";
import { getCurrentUser } from "@/lib/auth";
import type { ResultsSummary } from "@/lib/session-store";

/**
 * Prefer server-scored attempt data so client-edited summaries can't fake a PDF.
 * Falls back to the client summary only if the attempt isn't in Supabase yet.
 * Embeds the signed-in user's profile photo when available.
 */
export async function downloadResultsPdf(summary: ResultsSummary): Promise<{
  ok: boolean;
  error?: string;
  base64?: string;
  filename?: string;
}> {
  try {
    if (!summary?.attemptId) {
      return { ok: false, error: "Missing results data." };
    }

    let payload = summary;
    const server = await getServerResultsSummary(summary.attemptId);
    if (server.ok && server.summary) {
      payload = {
        ...server.summary,
        // Keep richer client fields when server omits them
        byDifficulty:
          server.summary.byDifficulty.length > 0
            ? server.summary.byDifficulty
            : summary.byDifficulty,
        performanceNote:
          server.summary.performanceNote || summary.performanceNote,
        sectionName:
          server.summary.sectionName !== "Session"
            ? server.summary.sectionName
            : summary.sectionName,
        paperName: server.summary.paperName ?? summary.paperName,
        studentName: summary.studentName || server.summary.studentName,
      };
    } else if (!summary.total) {
      return { ok: false, error: server.error ?? "Missing results data." };
    }

    const user = await getCurrentUser();
    const { bytes, filename } = await buildResultsPdf(payload, {
      avatarUrl: user?.avatar_url,
    });
    return { ok: true, base64: pdfBytesToBase64(bytes), filename };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

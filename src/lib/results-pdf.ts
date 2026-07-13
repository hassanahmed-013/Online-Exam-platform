import { jsPDF } from "jspdf";
import type { ResultsSummary } from "@/lib/session-store";

const SIGNATORY_NAME = "Dr Hassan Ahmed";

/** Mulberry32 — tiny seeded PRNG so one PDF is coherent. */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type Pt = { x: number; y: number };

function jitter(rand: () => number, amount: number) {
  return (rand() - 0.5) * 2 * amount;
}

/** Quadratic bezier polyline (smooth ink stroke). */
function strokeCurve(doc: jsPDF, points: Pt[], stepsPerSeg = 10) {
  if (points.length < 2) return;
  let prev = points[0]!;
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i]!;
    const p1 = points[i + 1]!;
    const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    for (let k = 1; k <= stepsPerSeg; k++) {
      const t = k / stepsPerSeg;
      const mt = 1 - t;
      const qx = mt * mt * prev.x + 2 * mt * t * p0.x + t * t * mid.x;
      const qy = mt * mt * prev.y + 2 * mt * t * p0.y + t * t * mid.y;
      doc.line(prev.x, prev.y, qx, qy);
      prev = { x: qx, y: qy };
    }
    prev = mid;
  }
  const last = points[points.length - 1]!;
  doc.line(prev.x, prev.y, last.x, last.y);
}

/**
 * Cursive-style "Hassan Ahmed" signature — letter-like strokes with
 * slight natural variation each download.
 */
function drawHassanAhmedSignature(
  doc: jsPDF,
  x: number,
  y: number,
  rand: () => number
) {
  const j = (n: number) => jitter(rand, n);
  doc.setLineCap("round");
  doc.setLineJoin("round");

  const ink: [number, number, number] = [28, 36, 72];
  doc.setDrawColor(...ink);

  // Capital "H"
  doc.setLineWidth(1.55);
  strokeCurve(doc, [
    { x: x + 2 + j(1), y: y + 16 + j(1) },
    { x: x + 4 + j(1), y: y - 2 + j(1) },
    { x: x + 10 + j(1), y: y + 2 + j(1) },
    { x: x + 8 + j(1), y: y + 14 + j(1) },
    { x: x + 14 + j(1), y: y + 6 + j(1) },
    { x: x + 18 + j(1), y: y + 12 + j(1) },
  ]);

  // "assan" body
  doc.setLineWidth(1.35);
  strokeCurve(doc, [
    { x: x + 18 + j(1), y: y + 12 + j(1) },
    { x: x + 26 + j(1.5), y: y + 18 + j(1) },
    { x: x + 34 + j(1.5), y: y + 4 + j(1) },
    { x: x + 42 + j(1.5), y: y + 16 + j(1) },
    { x: x + 50 + j(1.5), y: y + 6 + j(1) },
    { x: x + 58 + j(1.5), y: y + 15 + j(1) },
    { x: x + 68 + j(1.5), y: y + 8 + j(1) },
    { x: x + 76 + j(1), y: y + 14 + j(1) },
  ]);

  // Small flourish dot between names
  doc.setFillColor(...ink);
  doc.circle(x + 82 + j(1), y + 2 + j(1), 1.1, "F");

  // "A" of Ahmed
  doc.setLineWidth(1.5);
  strokeCurve(doc, [
    { x: x + 88 + j(1), y: y + 16 + j(1) },
    { x: x + 96 + j(1), y: y - 4 + j(1) },
    { x: x + 108 + j(1), y: y + 16 + j(1) },
  ]);
  doc.setLineWidth(1.15);
  doc.line(x + 93 + j(1), y + 8 + j(0.8), x + 103 + j(1), y + 8 + j(0.8));

  // "hmed"
  doc.setLineWidth(1.3);
  strokeCurve(doc, [
    { x: x + 108 + j(1), y: y + 16 + j(1) },
    { x: x + 116 + j(1.2), y: y + 4 + j(1) },
    { x: x + 124 + j(1.2), y: y + 16 + j(1) },
    { x: x + 132 + j(1.2), y: y + 6 + j(1) },
    { x: x + 142 + j(1.2), y: y + 14 + j(1) },
    { x: x + 152 + j(1), y: y + 8 + j(1) },
    { x: x + 162 + j(1), y: y + 12 + j(1) },
  ]);

  // End swoosh
  doc.setLineWidth(1.2);
  strokeCurve(doc, [
    { x: x + 162 + j(1), y: y + 12 + j(1) },
    { x: x + 172 + j(1), y: y + 2 + j(1) },
    { x: x + 184 + j(1.5), y: y + 10 + j(1) },
    { x: x + 196 + j(1), y: y + 6 + j(1) },
  ]);

  // Teal double underline
  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(1.05);
  const uy = y + 22 + j(0.6);
  strokeCurve(doc, [
    { x: x + 4, y: uy },
    { x: x + 70 + j(2), y: uy + 1 + j(0.5) },
    { x: x + 140 + j(2), y: uy - 0.5 + j(0.5) },
    { x: x + 198, y: uy + 1 },
  ]);
  doc.setLineWidth(0.65);
  doc.setDrawColor(45, 212, 191);
  strokeCurve(doc, [
    { x: x + 18, y: uy + 5 },
    { x: x + 90 + j(2), y: uy + 4.5 + j(0.4) },
    { x: x + 150, y: uy + 5.5 },
  ]);
}

function scoreTone(percent: number): {
  fill: [number, number, number];
  ink: [number, number, number];
  label: string;
} {
  if (percent >= 80)
    return { fill: [236, 253, 245], ink: [5, 150, 105], label: "Excellent" };
  if (percent >= 60)
    return { fill: [240, 253, 250], ink: [15, 118, 110], label: "Good" };
  if (percent >= 40)
    return { fill: [255, 251, 235], ink: [180, 83, 9], label: "Fair" };
  return { fill: [254, 242, 242], ink: [185, 28, 28], label: "Needs work" };
}

function ensureSpace(doc: jsPDF, y: number, need: number, margin: number) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + need < pageH - 56) return y;
  doc.addPage();
  return margin;
}

function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "S";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

type PdfAvatar = { dataUrl: string; format: "JPEG" | "PNG" | "WEBP" };

/**
 * Download a public avatar URL for embedding in the PDF.
 * Returns null on any failure so PDF generation still succeeds.
 */
export async function fetchAvatarForPdf(
  url: string | null | undefined
): Promise<PdfAvatar | null> {
  const trimmed = (url ?? "").trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return null;
  try {
    const res = await fetch(trimmed, { cache: "no-store" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > 2 * 1024 * 1024) return null;

    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const lower = trimmed.toLowerCase();
    let format: PdfAvatar["format"] = "JPEG";
    if (ct.includes("png") || lower.includes(".png")) format = "PNG";
    else if (ct.includes("webp") || lower.includes(".webp")) format = "WEBP";
    else if (ct.includes("jpeg") || ct.includes("jpg") || lower.includes(".jpg") || lower.includes(".jpeg"))
      format = "JPEG";
    else if (!ct.startsWith("image/")) return null;

    const mime =
      format === "PNG" ? "image/png" : format === "WEBP" ? "image/webp" : "image/jpeg";
    return { dataUrl: `data:${mime};base64,${buf.toString("base64")}`, format };
  } catch {
    return null;
  }
}

function drawStudentAvatar(
  doc: jsPDF,
  x: number,
  y: number,
  size: number,
  name: string,
  avatar: PdfAvatar | null
) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2;

  if (avatar) {
    try {
      // Clip to a circle so the stored square photo reads as a portrait.
      doc.saveGraphicsState();
      doc.circle(cx, cy, r, null);
      doc.clip();
      doc.discardPath();
      doc.addImage(avatar.dataUrl, avatar.format, x, y, size, size);
      doc.restoreGraphicsState();
    } catch {
      avatar = null;
    }
  }

  if (!avatar) {
    doc.setFillColor(15, 118, 110);
    doc.circle(cx, cy, r, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size >= 48 ? 16 : 13);
    doc.text(studentInitials(name), cx, cy + (size >= 48 ? 5.5 : 4.5), {
      align: "center",
    });
  }

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(3);
  doc.circle(cx, cy, r - 0.5, "S");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1.25);
  doc.circle(cx, cy, r, "S");
}

/** Build a branded MedPrep results PDF from the same summary the results card uses. */
export async function buildResultsPdf(
  summary: ResultsSummary,
  options?: { avatarUrl?: string | null }
): Promise<{
  bytes: Uint8Array;
  filename: string;
}> {
  const avatar = await fetchAvatarForPdf(options?.avatarUrl);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;

  const seed =
    hashSeed(`${summary.attemptId}:${SIGNATORY_NAME}`) ^
    (Date.now() & 0xffffffff) ^
    Math.floor(Math.random() * 0xffffffff);
  const rand = mulberry32(seed);
  const certId = `MP-${(seed >>> 0).toString(16).toUpperCase().slice(0, 8)}`;

  const tone = scoreTone(summary.scorePercent);
  const displayName = summary.studentName || "Student";

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageW, pageH, "F");

  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, pageW, 132, "F");
  doc.setFillColor(13, 148, 136);
  doc.rect(0, 100, pageW, 32, "F");
  doc.setFillColor(45, 212, 191);
  doc.rect(0, 128, pageW, 4, "F");

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 28, 36, 36, 8, 8, "F");
  doc.setTextColor(15, 118, 110);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("M", margin + 11, 52);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("MedPrep", margin + 48, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(204, 251, 241);
  doc.text("Official session results certificate", margin + 48, 62);

  doc.setFontSize(9);
  doc.setTextColor(153, 246, 228);
  doc.text(`Certificate ID  ${certId}`, pageW - margin, 44, { align: "right" });
  doc.text(summary.completedAtLabel, pageW - margin, 58, { align: "right" });

  let y = 160;

  const cardTop = y;
  const cardH = 210;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.roundedRect(margin, cardTop, contentW, cardH, 14, 14, "FD");

  const avatarSize = 52;
  const avatarX = margin + 24;
  const avatarY = cardTop + 22;
  drawStudentAvatar(doc, avatarX, avatarY, avatarSize, displayName, avatar);

  const textX = avatarX + avatarSize + 16;
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("PREPARED FOR", textX, cardTop + 28);
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(displayName, textX, cardTop + 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  const scope = summary.paperName
    ? `${summary.sectionName}  ·  ${summary.modeLabel}  ·  ${summary.paperName}`
    : `${summary.sectionName}  ·  ${summary.modeLabel}`;
  const scopeLines = doc.splitTextToSize(scope, contentW - 200 - avatarSize);
  doc.text(scopeLines, textX, cardTop + 68);

  const badgeX = pageW - margin - 118;
  const badgeY = cardTop + 36;
  const badgeR = 46;
  doc.setFillColor(...tone.fill);
  doc.circle(badgeX, badgeY + 10, badgeR, "F");
  doc.setDrawColor(...tone.ink);
  doc.setLineWidth(3);
  doc.circle(badgeX, badgeY + 10, badgeR - 4, "S");
  doc.setTextColor(...tone.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text(`${summary.scorePercent}%`, badgeX, badgeY + 18, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(tone.label.toUpperCase(), badgeX, badgeY + 34, { align: "center" });

  const pillY = cardTop + 120;
  const pillW = (contentW - 60) / 3;
  const pills: { label: string; value: string; accent: [number, number, number] }[] = [
    {
      label: "Correct",
      value: `${summary.correct} / ${summary.total}`,
      accent: [16, 185, 129],
    },
    {
      label: "Accuracy",
      value: `${summary.scorePercent}%`,
      accent: [15, 118, 110],
    },
    {
      label: "Time taken",
      value: summary.durationLabel,
      accent: [14, 165, 233],
    },
  ];
  pills.forEach((pill, i) => {
    const px = margin + 24 + i * (pillW + 6);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(px, pillY, pillW, 58, 10, 10, "F");
    doc.setFillColor(...pill.accent);
    doc.roundedRect(px, pillY, 4, 58, 10, 10, "F");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(pill.label.toUpperCase(), px + 14, pillY + 20);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(pill.value, px + 14, pillY + 42);
  });

  y = cardTop + cardH + 28;

  if (summary.byDifficulty.length) {
    y = ensureSpace(doc, y, 40 + summary.byDifficulty.length * 36, margin);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Performance by difficulty", margin, y);
    y += 16;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    const boxH = 20 + summary.byDifficulty.length * 36;
    doc.roundedRect(margin, y, contentW, boxH, 12, 12, "FD");
    let rowY = y + 22;
    for (const row of summary.byDifficulty) {
      const label =
        row.difficulty.charAt(0).toUpperCase() + row.difficulty.slice(1);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(label, margin + 18, rowY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(
        `${row.correct}/${row.total}  (${row.percent}%)`,
        pageW - margin - 18,
        rowY,
        { align: "right" }
      );
      rowY += 10;
      const barX = margin + 18;
      const barW = contentW - 36;
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(barX, rowY, barW, 8, 4, 4, "F");
      const fillW = Math.max(4, (barW * Math.min(100, row.percent)) / 100);
      const barColor =
        row.percent >= 70
          ? ([16, 185, 129] as const)
          : row.percent >= 40
            ? ([245, 158, 11] as const)
            : ([239, 68, 68] as const);
      doc.setFillColor(barColor[0], barColor[1], barColor[2]);
      doc.roundedRect(barX, rowY, fillW, 8, 4, 4, "F");
      rowY += 26;
    }
    y += boxH + 24;
  }

  if (summary.performanceNote) {
    y = ensureSpace(doc, y, 72, margin);
    doc.setFillColor(...tone.fill);
    doc.roundedRect(margin, y, contentW, 64, 12, 12, "F");
    doc.setFillColor(...tone.ink);
    doc.circle(margin + 22, y + 32, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("i", margin + 22, y + 35, { align: "center" });
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Coach note", margin + 40, y + 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const noteLines = doc.splitTextToSize(
      summary.performanceNote,
      contentW - 56
    );
    doc.text(noteLines, margin + 40, y + 40);
    y += 80;
  }

  y = ensureSpace(doc, y, 120, margin);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageW - margin, y);
  y += 28;

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("AUTHORIZED SIGNATURE", margin, y);
  doc.text("VERIFICATION", pageW - margin - 120, y);

  y += 14;
  drawHassanAhmedSignature(doc, margin, y + 6, rand);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(SIGNATORY_NAME, margin, y + 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("MedPrep Academic Reviewer", margin, y + 64);

  const stampX = pageW - margin - 70;
  const stampY = y + 28;
  doc.setDrawColor(...tone.ink);
  doc.setLineWidth(1.5);
  doc.circle(stampX, stampY, 28, "S");
  doc.setLineWidth(0.7);
  doc.circle(stampX, stampY, 22, "S");
  doc.setTextColor(...tone.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("MEDPREP", stampX, stampY - 4, { align: "center" });
  doc.setFontSize(6);
  doc.text("VERIFIED", stampX, stampY + 6, { align: "center" });
  doc.setFontSize(5);
  doc.text(certId.slice(-6), stampX, stampY + 14, { align: "center" });

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(15, 118, 110);
    doc.rect(0, pageH - 28, pageW, 28, "F");
    doc.setTextColor(204, 251, 241);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Generated by MedPrep  ·  For personal study use", margin, pageH - 12);
    doc.text(`Page ${p} of ${pageCount}`, pageW - margin, pageH - 12, {
      align: "right",
    });
  }

  const sectionSlug = summary.sectionName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const date = new Date(summary.completedAt).toISOString().slice(0, 10);
  const filename = `medprep-result-${sectionSlug || "session"}-${date}.pdf`;

  const ab = doc.output("arraybuffer");
  return { bytes: new Uint8Array(ab), filename };
}

export function pdfBytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

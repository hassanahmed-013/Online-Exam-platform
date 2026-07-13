// Self-contained cover images for category cards.
//
// The addendum calls for a representative picture per subject. To keep the demo
// fully offline (no external image hosts, no next/image remote config) we
// generate lightweight thematic SVGs as data: URIs. When Supabase Storage is
// wired up, admin-uploaded covers land in `Category.cover_image_url` and take
// precedence over these — both render through the same <img> path.

interface CoverSpec {
  from: string;
  to: string;
  /** A simple emoji/glyph drawn large and faint in the corner. */
  glyph: string;
}

const SUBJECT_COVERS: Record<string, CoverSpec> = {
  biology: { from: "#059669", to: "#65a30d", glyph: "🧬" },
  chemistry: { from: "#0284c7", to: "#4f46e5", glyph: "⚗️" },
  physics: { from: "#7c3aed", to: "#c026d3", glyph: "🧲" },
  english: { from: "#0d9488", to: "#0891b2", glyph: "📖" },
};

const FALLBACK: CoverSpec = { from: "#0d9488", to: "#059669", glyph: "🎓" };

function svgDataUri({ from, to, glyph }: CoverSpec, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320" viewBox="0 0 640 320">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <pattern id="d" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.5" fill="#ffffff" fill-opacity="0.18"/>
    </pattern>
  </defs>
  <rect width="640" height="320" fill="url(#g)"/>
  <rect width="640" height="320" fill="url(#d)"/>
  <text x="470" y="250" font-size="220" opacity="0.28">${glyph}</text>
  <text x="36" y="270" font-family="Georgia, serif" font-size="52" font-weight="700" fill="#ffffff">${label}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** A themed cover data-URI for a subject slug (falls back to a generic one). */
export function subjectCover(slug: string, label: string): string {
  const spec = SUBJECT_COVERS[slug] ?? FALLBACK;
  return svgDataUri(spec, label);
}

// A couple of question reference images, also inline so they work offline.
export const MITOCHONDRION_DIAGRAM =
  "data:image/svg+xml," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="520" height="300" viewBox="0 0 520 300">
  <rect width="520" height="300" fill="#f8fafc"/>
  <ellipse cx="260" cy="150" rx="200" ry="105" fill="#fecaca" stroke="#b91c1c" stroke-width="4"/>
  <path d="M70 150 q30 -55 70 0 q30 55 70 0 q30 -55 70 0 q30 55 70 0 q30 -55 70 0" fill="none" stroke="#b91c1c" stroke-width="4"/>
  <text x="260" y="285" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#334155">Mitochondrion — inner membrane cristae (site of the electron transport chain)</text>
</svg>`);

export const NEPHRON_DIAGRAM =
  "data:image/svg+xml," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="520" height="300" viewBox="0 0 520 300">
  <rect width="520" height="300" fill="#f8fafc"/>
  <circle cx="110" cy="90" r="42" fill="#bfdbfe" stroke="#1d4ed8" stroke-width="4"/>
  <text x="110" y="95" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#1e3a8a">Glomerulus</text>
  <path d="M150 110 q90 20 60 90 q-30 70 90 40" fill="none" stroke="#1d4ed8" stroke-width="6"/>
  <path d="M300 240 q60 -20 40 -110 q-15 -70 70 -40" fill="none" stroke="#0891b2" stroke-width="6"/>
  <text x="200" y="210" font-family="sans-serif" font-size="15" fill="#334155">PCT</text>
  <text x="360" y="120" font-family="sans-serif" font-size="15" fill="#334155">DCT</text>
  <text x="260" y="292" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#334155">Nephron — glucose is reabsorbed in the proximal convoluted tubule</text>
</svg>`);

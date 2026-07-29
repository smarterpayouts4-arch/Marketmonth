/**
 * Display-safe text repairs shared by the engine and the Discovery UI.
 * Lives in `lib` because Discovery UI may not import from `src/engine/`.
 */

/**
 * Drops a run of stacked headings that a crawler concatenated onto the front of
 * a paragraph — "About ZYNAVA Why ZYNAVA Exists The supplement market presents…"
 * becomes "The supplement market presents…".
 *
 * The prose start is the last capitalized word before the first lowercase word,
 * so an ordinary sentence ("We simplify…", "Choose your…") is never altered.
 */
export function stripLeadingHeadingRun(text: string): string {
  const words = text.split(" ");
  const firstLower = words.findIndex((w) => /^[a-z]/.test(w));
  if (firstLower < 2) return text;

  const prefix = words.slice(0, firstLower - 1);
  const rest = words.slice(firstLower - 1);
  // Three or more stacked capitalized words indicate concatenated headings.
  // Fewer than that is usually a real tagline ("ZYNAVA Free AI-powered search").
  if (prefix.length < 3 || rest.length < 6) return text;
  if (!prefix.every((w) => /^[^a-z]/.test(w))) return text;
  // A heading run carries no internal punctuation; prose usually does.
  if (prefix.some((w) => /[.!?,;:]/.test(w))) return text;
  return rest.join(" ");
}

/** Trailing clause punctuation left behind by a word-boundary cut. */
export function trimDanglingPunctuation(text: string): string {
  return text.replace(/\s*[,;:–—-]+$/, "").trim();
}

/**
 * Shortens a quoted excerpt without splitting a word. A plain `slice` produced
 * excerpts ending "…often feel more confused, not le".
 */
export function clipToWordBoundary(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  const window = t.slice(0, maxChars);
  const lastSpace = window.lastIndexOf(" ");
  const clipped = lastSpace > maxChars * 0.5 ? window.slice(0, lastSpace) : window;
  return trimDanglingPunctuation(clipped);
}

const DANGLING_WORD_RE =
  /\b(of|the|a|an|and|or|to|for|with|by|in|on|at|from|is|are|was|were|that|which|as|but|if|than|then|when|while|into|over|under|about|not|no|yet|so)$/i;

/**
 * Ends a truncated quote where a reader would naturally stop: at the last clause
 * boundary, never on a dangling function word.
 */
export function endAtReadableBoundary(text: string): string {
  let out = trimDanglingPunctuation(text);
  if (!/[.!?]$/.test(out)) {
    const lastClause = out.lastIndexOf(", ");
    if (lastClause > out.length * 0.5) out = out.slice(0, lastClause);
  }
  out = trimDanglingPunctuation(out);
  while (out && DANGLING_WORD_RE.test(out)) {
    const cut = out.lastIndexOf(" ");
    if (cut < 0) break;
    out = trimDanglingPunctuation(out.slice(0, cut));
  }
  return out;
}

/**
 * A bare link carries no prose. Shown as a readable locator instead of a raw
 * URL so evidence rows stay legible.
 */
export function readableUrlLabel(text: string): string | null {
  const t = text.trim();
  if (!/^https?:\/\/\S+$/i.test(t) && !/^www\.\S+$/i.test(t)) return null;
  return t
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "");
}

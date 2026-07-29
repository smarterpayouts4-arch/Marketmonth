/**
 * Complete-sentence helpers for activation evidence/insights.
 * Prefer existing complete sentences; rewrite short complete lines; never hard-clip mid-phrase.
 */

import { stripLeadingHeadingRun } from "@/lib/discovery/text-display";

const MAX_WORDS_DISPLAY = 28;

/** Below this a trimmed embed carries no useful meaning — omit it instead. */
const MIN_EMBED_CHARS = 24;

/** How far a complete sentence may exceed the budget before we drop it. */
const SENTENCE_GRACE = 1.35;

/** Words that must not end an embed — they signal a cut mid-clause. */
const DANGLING_RE =
  /\b(of|the|a|an|and|or|to|for|with|by|in|on|at|from|is|are|was|were|that|which|as|but|if|than|then|when|while|into|over|under|about)$/i;

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function dropDanglingTail(text: string): string {
  let out = text.trim().replace(/[,;:]+$/, "").trim();
  while (out.length >= MIN_EMBED_CHARS && DANGLING_RE.test(out)) {
    const cut = out.lastIndexOf(" ");
    if (cut < 0) return "";
    out = out.slice(0, cut).replace(/[,;:]+$/, "").trim();
  }
  return out;
}

/**
 * Boundary-safe text for embedding inside a generated sentence.
 * Prefers a complete sentence, then a sentence boundary, then a word boundary —
 * and returns null rather than emitting a fragment. Replaces hard `.slice(0, n)`
 * clips, which produced tails like "…across participating retailers a.".
 */
export function truncateForEmbed(
  text: string,
  maxChars = 160
): string | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  if (/[{}[\]]|schema\.org|application\/ld/i.test(normalized)) return null;
  const t = stripLeadingHeadingRun(normalized);

  // A whole sentence slightly over budget still beats a fragment.
  const sentence = extractCompleteSentence(t);
  if (sentence && sentence.length <= Math.round(maxChars * SENTENCE_GRACE)) {
    return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
  }

  const window = t.length <= maxChars ? t : t.slice(0, maxChars);
  const lastStop = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? ")
  );
  if (lastStop >= MIN_EMBED_CHARS) {
    return window.slice(0, lastStop + 1).trim();
  }

  // Needs cutting and the window holds no sentence boundary: any cut here lands
  // mid-clause (typically glued heading text). Omit rather than fake a sentence.
  if (t.length > maxChars) return null;

  let clipped = window;
  if (t.length > maxChars) {
    const lastSpace = clipped.lastIndexOf(" ");
    if (lastSpace < MIN_EMBED_CHARS) return null;
    clipped = clipped.slice(0, lastSpace);
  }
  clipped = dropDanglingTail(clipped);
  if (clipped.length < MIN_EMBED_CHARS) return null;
  return /[.!?]$/.test(clipped) ? clipped : `${clipped}.`;
}

/**
 * Word-boundary trim for a noun phrase embedded mid-sentence.
 * Never appends terminal punctuation — the caller's sentence supplies it.
 */
export function truncatePhrase(text: string, maxChars = 80): string | null {
  const t = text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?]+$/, "")
    .trim();
  if (!t) return null;
  if (/[{}[\]]|schema\.org|application\/ld/i.test(t)) return null;
  if (t.length <= maxChars) return dropDanglingTail(t) || null;

  const window = t.slice(0, maxChars);
  const lastSpace = window.lastIndexOf(" ");
  if (lastSpace < 3) return null;
  const trimmed = dropDanglingTail(window.slice(0, lastSpace));
  return trimmed.length >= 3 ? trimmed : null;
}

export function isCompleteSentence(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length < 12) return false;
  if (/[{}\[\]@]|schema\.org|application\/ld/i.test(t)) return false;
  if (/\b(https?:\/\/|www\.)/i.test(t) && t.split(/\s+/).length < 6) return false;
  // Ends with sentence punctuation, or is a short title-like phrase without trailing junk
  if (/[.!?]"?$/.test(t)) return true;
  // Incomplete clause endings
  if (/\b(of|the|a|an|and|or|to|for|with|by|in|on)$/i.test(t)) return false;
  // Allow short noun phrases that look intentional (offers)
  if (wordCount(t) <= 8 && /^[A-Z0-9]/.test(t) && !/[.!?]$/.test(t)) return true;
  return wordCount(t) <= 12 && !/[,;:]$/.test(t);
}

/** First sentence that ends with . ! or ? */
export function extractCompleteSentence(text: string): string | null {
  const c = text.replace(/\s+/g, " ").trim();
  if (!c) return null;
  const m = c.match(/^(.+?[.!?])(?:\s|$)/);
  if (m?.[1] && isCompleteSentence(m[1])) return m[1].trim();
  if (isCompleteSentence(c)) return c;
  return null;
}

export function stripLeadingBrandName(text: string, businessName: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  const name = businessName.trim();
  if (!name) return t;
  // Strip brand + optional punctuation/copula only — keep action verbs
  // (simplifies, helps, …) so customer-value lines stay complete.
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `^${escaped}\\s*(?:[—\\-:,]|\\bis\\b)?\\s*`,
    "i"
  );
  const stripped = t.replace(re, "").trim();
  if (!stripped || stripped.length < 8) return t;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

/**
 * Produce display-safe copy: existing complete sentence, short rewrite, or null (omit).
 */
export function toDisplaySentence(
  text: string,
  options?: { businessName?: string; maxWords?: number }
): string | null {
  const maxWords = options?.maxWords ?? MAX_WORDS_DISPLAY;
  let raw = text.replace(/\s+/g, " ").trim();
  if (!raw) return null;
  if (/[{}\[\]@]|schema\.org|application\/ld/i.test(raw)) return null;

  if (options?.businessName) {
    raw = stripLeadingBrandName(raw, options.businessName);
  }

  const existing = extractCompleteSentence(raw);
  if (existing) {
    if (wordCount(existing) <= maxWords) return existing;
    // Rewrite: take first clause that still reads complete
    const shortened = existing
      .split(/[,;]/)
      .map((s) => s.trim())
      .find((s) => wordCount(s) >= 4 && wordCount(s) <= maxWords);
    if (shortened && isCompleteSentence(shortened + (shortened.endsWith(".") ? "" : "."))) {
      return shortened.endsWith(".") || shortened.endsWith("!") || shortened.endsWith("?")
        ? shortened
        : `${shortened}.`;
    }
    // Intentional rewrite: keep leading words only if last word is not a dangling preposition
    const words = existing.replace(/[.!?]+$/, "").split(/\s+/);
    let n = Math.min(maxWords, words.length);
    while (n > 4 && /\b(of|the|a|an|and|or|to|for|with|by|in|on)$/i.test(words.slice(0, n).join(" "))) {
      n -= 1;
    }
    const slice = words.slice(0, n).join(" ");
    if (isCompleteSentence(`${slice}.`)) return `${slice}.`;
    return null;
  }

  // No terminal punctuation — only accept short offer-like phrases
  if (wordCount(raw) <= 8 && isCompleteSentence(raw)) return raw;
  return null;
}

/**
 * Complete-sentence helpers for activation evidence/insights.
 * Prefer existing complete sentences; rewrite short complete lines; never hard-clip mid-phrase.
 */

const MAX_WORDS_DISPLAY = 28;

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
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

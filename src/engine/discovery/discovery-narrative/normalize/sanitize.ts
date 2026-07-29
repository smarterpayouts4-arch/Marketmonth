const PLACEHOLDER_RETRIEVED_AT = "1970-01-01T00:00:00.000Z";

const GENERIC_INSIGHT_PHRASES = [
  /create educational content/i,
  /expand to tiktok/i,
  /post more on social/i,
  /grow your brand/i,
  /engage your audience/i,
  /build awareness online/i,
  /^we sell things\.?$/i,
  /^(welcome|home|coming soon)\.?$/i,
];

/** Thin or generic marketing filler that must not drive headlines. */
export function failsGenericInsight(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 5) return true;
  return GENERIC_INSIGHT_PHRASES.some((re) => re.test(t));
}

const REJECT_PATTERNS = [
  /@context/i,
  /schema\.org/i,
  /application\/ld\+json/i,
  /<script[\s>]/i,
  /\{[\s\S]*"@type"/i,
  /^\s*\[\s*\]\s*$/,
  /^\s*\{\s*\}\s*$/,
  /placeholder/i,
  /neon[_-]?record/i,
  /candidate[_-]?id/i,
];

/** True when text looks like schema/script/junk that must never surface. */
export function shouldRejectEvidenceText(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t || t.length < 2) return true;
  if (REJECT_PATTERNS.some((re) => re.test(t))) return true;
  // Raw braces with JSON-like fragments in prose
  if ((t.includes("{") && t.includes("}")) && /"[a-zA-Z_]+"\s*:/.test(t)) {
    return true;
  }
  // Broken clipping endings
  if (/\b(not medica|multiple\s*\.|We)$/i.test(t) && t.length < 80) return true;
  return false;
}

export function sanitizeEvidenceText(text: string): string | null {
  let t = text
    .replace(/\r\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\u2192|→/g, "→")
    .replace(/[•·]/g, " · ")
    .replace(/\s+/g, " ")
    .trim();

  // Strip duplicated consecutive brand-name headings glued together
  t = t.replace(/\b([A-Z][A-Za-z0-9]{2,})\1\b/g, "$1");

  if (shouldRejectEvidenceText(t)) return null;
  return t;
}

export function isPlaceholderRetrievedAt(value: string | undefined | null): boolean {
  if (!value) return true;
  return value.trim() === PLACEHOLDER_RETRIEVED_AT;
}

/** Prefer complete sentences; reject mid-word clipping. */
export function looksClipped(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/\b(of|the|a|an|and|or|to|for|with|by|in|on|not medica|We)$/i.test(t)) {
    return true;
  }
  if (/multiple\s*\.\s*$/i.test(t)) return true;
  if (/[A-Za-z]$/.test(t) && !/[.!?)"']$/.test(t) && t.length > 80) {
    // Long prose without terminal punctuation is often a truncated blob
    return true;
  }
  return false;
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function normalizeUrlVariant(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    let path = u.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    u.pathname = path;
    return u.toString();
  } catch {
    return url.replace(/\/$/, "").trim();
  }
}

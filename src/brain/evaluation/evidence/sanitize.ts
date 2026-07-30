import { pipelineTrace } from "@/brain/debug/pipeline-trace";

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

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]{2,}/g;
const PHONE_RE =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g;

/** Short nav/CTA chrome — not usable as topic evidence. */
const NAV_CHROME_ARROW_RE =
  /^[\w\s'&/-]{2,48}(?:→|›|»|\u2192)\s*$/u;

const NAV_CHROME_IMPERATIVE_RE =
  /^(?:explore|start|learn|discover|shop|browse|get|try|see|view|find|save|contact|call|click|read more|learn more|get started|sign up|buy now|order now|book now|shop now|view all|see all|show more)\b[\w\s'&/-]{0,24}$/i;

const CAMEL_ALLOWLIST = [
  "LinkedIn",
  "YouTube",
  "TikTok",
  "PayPal",
  "WhatsApp",
  "iPhone",
  "iPad",
  "iOS",
  "macOS",
  "eBook",
  "eCommerce",
  "GmbH",
  "PhD",
  "McDonald",
  "OpenAI",
  "ChatGPT",
  "JavaScript",
  "TypeScript",
  "GitHub",
  "YouTuber",
];

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s]+/g;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const OPEN = "\u0001";
const CLOSE = "\u0002";

type Mask = { token: string; original: string };

function maskAll(
  text: string,
  phrases: string[]
): { masked: string; masks: Mask[] } {
  const masks: Mask[] = [];
  let masked = text;

  const mask = (match: string): string => {
    const token = `${OPEN}m${masks.length}${CLOSE}`;
    masks.push({ token, original: match });
    return token;
  };

  masked = masked.replace(URL_RE, mask);

  for (const phrase of phrases) {
    const trimmed = phrase.trim();
    if (trimmed.length < 2) continue;
    const re = new RegExp(escapeRegExp(trimmed), "gi");
    masked = masked.replace(re, (match, ...rest) => {
      const offset = rest[rest.length - 2] as number;
      const whole = rest[rest.length - 1] as string;
      const next = whole.charAt(offset + match.length);
      if (next && next >= "a" && next <= "z") return match;
      return mask(match);
    });
  }

  return { masked, masks };
}

function unmaskAll(text: string, masks: Mask[]): string {
  let out = text;
  for (const { token, original } of masks) {
    out = out.split(token).join(original);
  }
  return out;
}

/**
 * Split camel-glued crawl text on lowercase→UPPERCASE boundaries.
 * e.g. "VitaminsVitamin DThe Sunshine Vitamin" → ["Vitamins", "Vitamin D", "The Sunshine Vitamin"]
 */
export function segmentCamelGlued(
  text: string,
  protect: string[] = []
): string[] {
  if (!text.trim()) return [];

  const { masked, masks } = maskAll(text, [...protect, ...CAMEL_ALLOWLIST]);
  const repaired = masked
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1 $2")
    // Single capital + letter/digit run then capital word: "DThe", "B12The", "CThe"
    .replace(/([A-Z]\d*)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([.!?])([A-Z])/g, "$1 $2")
    .replace(new RegExp(`${CLOSE}([A-Z])`, "g"), `${CLOSE} $1`)
    .replace(new RegExp(`([a-z0-9])${OPEN}`, "g"), `$1 ${OPEN}`)
    .replace(/[^\S\n]{2,}/g, " ");

  const unmasked = unmaskAll(repaired, masks);
  return unmasked
    .split(/\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
}

function repairCamelGlued(text: string, protect: string[] = []): string {
  // Prefer join-preserving repair (keep phrase integrity) over word-split.
  const { masked, masks } = maskAll(text, [...protect, ...CAMEL_ALLOWLIST]);
  const repaired = masked
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1 $2")
    .replace(/([A-Z]\d*)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([.!?])([A-Z])/g, "$1 $2")
    .replace(new RegExp(`${CLOSE}([A-Z])`, "g"), `${CLOSE} $1`)
    .replace(new RegExp(`([a-z0-9])${OPEN}`, "g"), `$1 ${OPEN}`)
    .replace(/[^\S\n]{2,}/g, " ");
  const out = unmaskAll(repaired, masks).replace(/[^\S\n]{2,}/g, " ").trim();
  return out || text;
}

function scrubInlinePii(text: string): string {
  return text.replace(EMAIL_RE, "[email]").replace(PHONE_RE, "[phone]");
}

function isPiiOnly(text: string): boolean {
  const stripped = text
    .replace(EMAIL_RE, "")
    .replace(PHONE_RE, "")
    .replace(/[\s()[\].,-]/g, "")
    .trim();
  return stripped.length === 0 && (EMAIL_RE.test(text) || PHONE_RE.test(text));
}

function isScrubbedPlaceholderOnly(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  return /^(\[email\]|\[phone\])(\s*(\[email\]|\[phone\]))*$/.test(t);
}

/** True when text looks like schema/script/junk that must never surface. */
export function isRejectedEvidence(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t || t.length < 2) return true;
  if (REJECT_PATTERNS.some((re) => re.test(t))) return true;
  if (isPiiOnly(t) || isScrubbedPlaceholderOnly(t)) return true;
  if (isNavChrome(t)) return true;
  if (
    t.includes("{") &&
    t.includes("}") &&
    /"[a-zA-Z_]+"\s*:/.test(t)
  ) {
    return true;
  }
  if (/\b(not medica|multiple\s*\.|We)$/i.test(t) && t.length < 80) {
    return true;
  }
  return false;
}

export function isNavChrome(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (NAV_CHROME_ARROW_RE.test(t)) return true;
  if (t.length <= 28 && NAV_CHROME_IMPERATIVE_RE.test(t)) return true;
  return false;
}

/** Thin or generic marketing filler that must not drive headlines. */
export function failsGenericInsight(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 5) return true;
  return GENERIC_INSIGHT_PHRASES.some((re) => re.test(t));
}

const CAMEL_GLUED_RE =
  /[a-z][A-Z]|[A-Z]{2,}[A-Z][a-z]|[A-Z]\d*[A-Z][a-z]/;

export function sanitizeEvidenceValue(
  text: string,
  opts?: { protect?: string[] }
): string | null {
  let t = text
    .replace(/\r\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\u2192|→/g, "→")
    .replace(/[•·]/g, " · ")
    .replace(/\s+/g, " ")
    .trim();

  if (CAMEL_GLUED_RE.test(t)) {
    const before = t;
    t = repairCamelGlued(t, opts?.protect);
    if (t !== before) {
      pipelineTrace(
        "subject.deglue",
        { before, after: t },
        before.includes("DThe") || before.includes("CThe") ? "ok" : "warn"
      );
    }
  }
  t = scrubInlinePii(t);
  t = t.replace(/\b([A-Z][A-Za-z0-9]{2,})\1\b/g, "$1");

  if (isRejectedEvidence(t)) return null;
  return t;
}

export function isPlaceholderRetrievedAt(
  value: string | undefined | null
): boolean {
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

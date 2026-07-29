/**
 * Repairs text that lost its whitespace when adjacent HTML blocks were
 * concatenated — "About ZYNAVAWhy ZYNAVA ExistsThe supplement market".
 *
 * `html-clean` now separates blocks at crawl time, but profiles captured before
 * that fix still hold glued text, so evidence is repaired on read.
 */

/**
 * Intentional internal capitals that must survive. Splitting these would turn
 * "LinkedIn" into "Linked In" and a CamelCase brand into two words.
 */
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

/**
 * Delimiters chosen so the deglue rules cannot match a token's interior:
 * the payload is lowercase and digits only, and the open/close markers differ
 * so boundary repairs can still be applied around a masked phrase.
 */
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

  // URLs first — they carry punctuation the deglue rules would disturb.
  masked = masked.replace(URL_RE, mask);

  for (const phrase of phrases) {
    const trimmed = phrase.trim();
    if (trimmed.length < 2) continue;
    const re = new RegExp(escapeRegExp(trimmed), "gi");
    masked = masked.replace(re, (match, ...rest) => {
      // The boundary test must stay case-sensitive, so it cannot be a lookahead
      // on a case-insensitive pattern. A following lowercase letter means the
      // phrase is part of a longer word ("Flow" inside "Flower").
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
 * @param protect Additional phrases to preserve verbatim, typically the
 * business name so a CamelCase brand is not split.
 */
export function deglueText(text: string, protect: string[] = []): string {
  if (!text) return text;
  const { masked, masks } = maskAll(text, [...protect, ...CAMEL_ALLOWLIST]);

  const repaired = masked
    // "ZYNAVAWhy" — an acronym run followed by a capitalized word.
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1 $2")
    // "ExistsThe" — a word or number followed by a new capital.
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    // "place.We" — a sentence boundary with no following space.
    .replace(/([.!?])([A-Z])/g, "$1 $2")
    // Same repairs where one side is a masked phrase: "ClearFlowOur Services".
    .replace(new RegExp(`${CLOSE}([A-Z])`, "g"), `${CLOSE} $1`)
    .replace(new RegExp(`([a-z0-9])${OPEN}`, "g"), `$1 ${OPEN}`)
    .replace(/[^\S\n]{2,}/g, " ");

  return unmaskAll(repaired, masks);
}

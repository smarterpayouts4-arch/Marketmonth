import { clampLabel } from "./label-text";
import { analyzeMalformedSubject } from "./subject-rejection";

/**
 * Incomplete / non-noun leads and multi-item catalog blobs that must never
 * become topic subjects. Does not invent replacements — callers discard.
 */
export function isMalformedSubjectLabel(label: string): boolean {
  return analyzeMalformedSubject(label).malformed;
}

const GROUNDED_AUDIENCE_NOUN =
  /\b(shoppers|buyers|customers|patients|parents|users|people)\b/i;

/**
 * Normalize opportunity / marketing strings into a usable subject label,
 * or null to discard the extraction candidate.
 *
 * Recover only when the complete source sentence contains an explicit,
 * grammatically usable audience/problem phrase. Never invent audience nouns.
 */
export function normalizeOpportunityLabel(raw: string): string | null {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return null;

  if (/^(Help|Helping)\b/i.test(t)) {
    const rest = t.replace(/^(Help|Helping)\s+/i, "").trim();
    if (!rest) return null;

    // e.g. "overwhelmed shoppers compare…" — both words must already be in source
    const audiencePhrase = rest.match(
      /^((?:[\w'-]+\s+){0,2}(?:shoppers|buyers|customers|patients|parents|users|people))\b/i
    );
    if (audiencePhrase?.[1]) {
      const phrase = audiencePhrase[1].trim();
      const words = phrase.split(/\s+/);
      // Require grounded audience noun + at least one modifier already in text
      if (words.length >= 2 && GROUNDED_AUDIENCE_NOUN.test(phrase)) {
        return clampLabel(phrase, 80);
      }
    }

    // Longer recoverable problem clause that still contains a grounded audience noun
    if (GROUNDED_AUDIENCE_NOUN.test(rest) && rest.split(/\s+/).length >= 4) {
      const clipped = rest
        .replace(
          /\s+(?:compare|comparing|before|when|to|across|using)\b[\s\S]*$/i,
          ""
        )
        .trim();
      if (
        clipped.length >= 8 &&
        GROUNDED_AUDIENCE_NOUN.test(clipped) &&
        !isMalformedSubjectLabel(clipped)
      ) {
        return clampLabel(clipped, 80);
      }
    }

    return null;
  }

  if (isMalformedSubjectLabel(t)) return null;

  // Incomplete "Shoppers comparing…" without a grounded object
  if (
    /^(shoppers|buyers|customers|people)\s+comparing\b/i.test(t) &&
    t.split(/\s+/).length < 4
  ) {
    return null;
  }

  return clampLabel(t, 80);
}

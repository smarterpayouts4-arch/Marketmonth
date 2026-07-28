import { clampLabel } from "./label-text";

/**
 * Incomplete / non-noun leads that must never become topic subjects.
 * Does not invent replacements — callers discard when normalize returns null.
 */
export function isMalformedSubjectLabel(label: string): boolean {
  const t = label.trim().replace(/\s+/g, " ");
  if (!t) return true;
  // Bare Help/Helping chops (e.g. "Help overwhelmed")
  if (/^(Help|Helping)\s+\S+$/i.test(t)) return true;
  if (/^(Help|Helping)\b/i.test(t) && t.split(/\s+/).length < 3) return true;
  // Incomplete interrogatives
  if (/^(How|What|Why|When|Where|Who)\s*$/i.test(t)) return true;
  if (/^(How|What|Why)\s+(to|about|for)?\s*$/i.test(t)) return true;
  // Audience noun + bare participle with no problem clause ("Shoppers comparing")
  if (
    /^(shoppers|buyers|customers|patients|parents|users|people)\s+(comparing|shopping|looking|buying|choosing)$/i.test(
      t
    )
  ) {
    return true;
  }
  // Broken prepositional fragments ("… in on", "… for to")
  if (/\b(in on|for to|of to|at to|to to)\b/i.test(t)) return true;
  if (/\b(in|on|at|for|to|of|and|or)\s*$/i.test(t)) return true;
  // Too short / incomplete noun phrase
  if (t.split(/\s+/).length === 1 && t.length < 4) return true;
  return false;
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

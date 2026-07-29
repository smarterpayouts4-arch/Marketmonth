/**
 * Shared creative-field safety for topic-title-hook and direction hook-enrichment.
 * Framing may change; subjects/facts/medical claims must not be invented.
 */

/**
 * Bare `prevent` is included deliberately. Requiring `prevents disease` let
 * "prevents deficiency" and "prevent hair loss" through, which are disease-claim
 * shaped for a supplement seller. This is the unified rule for every caller.
 */
export const MEDICAL_CLAIM_RE =
  /\b(treats?|cures?|heals?|diagnoses?|prevents?|preventing|prevention|clinically\s+proven|FDA\s+approved)\b/i;

export const STUDY_CERT_RE =
  /\b(study|studies|clinical\s+trial|peer[- ]reviewed|certified|certification|ISO\s*\d+)\b/i;

export const NUMBER_RE = /\b\d+(?:\.\d+)?%?\b/;

export function tokenizeEntities(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 4)
  );
}

/** True when every significant subject token appears in the creative title. */
export function subjectTokensPresent(
  subject: string,
  title: string
): boolean {
  const subjectTokens = [...tokenizeEntities(subject)].filter(
    (t) =>
      !/^(with|from|that|this|what|when|your|their|about|before|after)$/.test(t)
  );
  if (subjectTokens.length === 0) {
    return title.toLowerCase().includes(subject.trim().toLowerCase().slice(0, 12));
  }
  const titleTokens = tokenizeEntities(title);
  const required = subjectTokens.slice(0, 3);
  return required.every((t) => titleTokens.has(t) || title.toLowerCase().includes(t));
}

export const THERAPEUTIC_OUTCOME_CLAIM_RE =
  /\b(for better|to treat|cures?|heals?|prevents?)\b/i;

/** Attribution / label-deconstruction framing that makes outcome language safe. */
export const OUTCOME_ATTRIBUTION_RE =
  /["'""]|(?:is|are)\s+(?:label(?:led|ed)|described|called|nicknamed)\s+(?:as\s+)?|(?:label(?:led|ed)|described)\s+as|research\s+(?:support(?:s|ed)?|suggests?|indicates?|shows?)|according\s+to|what\s+(?:the\s+)?research\s+(?:says|shows|indicates)|what\s+that\s+wording\s+means|on labels|label language|will and will not/i;

export function hasOutcomeClaimWithoutAttribution(text: string): boolean {
  if (OUTCOME_ATTRIBUTION_RE.test(text)) return false;
  if (THERAPEUTIC_OUTCOME_CLAIM_RE.test(text)) return true;
  if (MEDICAL_CLAIM_RE.test(text)) return true;
  return false;
}

export function outcomeClaimSafety(
  text: string
): { ok: true } | { ok: false; reason: string } {
  if (hasOutcomeClaimWithoutAttribution(text)) {
    return { ok: false, reason: "outcome claim without attribution" };
  }
  return { ok: true };
}

export function hasMedicalOrStudyClaim(text: string): boolean {
  return MEDICAL_CLAIM_RE.test(text) || STUDY_CERT_RE.test(text);
}

export function hasNewNumbers(
  creative: string,
  allowedBlob: string
): boolean {
  const allowed = new Set(
    (allowedBlob.match(NUMBER_RE) ?? []).map((n) => n.toLowerCase())
  );
  for (const n of creative.match(NUMBER_RE) ?? []) {
    if (!allowed.has(n.toLowerCase())) return true;
  }
  return false;
}

export function titleLengthOk(
  title: string,
  min = 24,
  max = 90
): boolean {
  const t = title.trim();
  return t.length >= min && t.length <= max;
}

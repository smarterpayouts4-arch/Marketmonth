import {
  hasMedicalOrStudyClaim,
  hasNewNumbers,
  outcomeClaimSafety,
  subjectTokensPresent,
  titleLengthOk,
} from "../../creative-safety";
import type { TopicSeed } from "../../objective-topic-strategies";

/**
 * Fail closed → keep framed educational title.
 */
export function validateHookedTitle(args: {
  seed: TopicSeed;
  framedTitle: string;
  hookedTitle: string;
}): { ok: true } | { ok: false; reason: string } {
  const { seed, framedTitle, hookedTitle } = args;
  const title = hookedTitle.trim();

  if (!titleLengthOk(title, 18, 90)) {
    return { ok: false, reason: "title length out of bounds" };
  }
  if (/\b(Why|The|One)\s+(How|What|Why)\b/i.test(title)) {
    return { ok: false, reason: "stacked interrogative lead" };
  }
  if (/\b(Why|The|One)\s+(Help|Helping)\b/i.test(title)) {
    return { ok: false, reason: "help-imperative subject lead" };
  }
  if (/\bHelp(?:ing)?\s+overwhelmed\b/i.test(title)) {
    return { ok: false, reason: "malformed help-overwhelmed subject" };
  }
  if (/\bmost shoppers\b/i.test(title)) {
    return { ok: false, reason: "ungrounded crowd claim" };
  }
  if (/\buntil you check this\b/i.test(title) || /\bcheck this\b/i.test(title)) {
    return { ok: false, reason: "vague check-this deixis" };
  }
  if (/\blabel detail\b/i.test(title)) {
    return { ok: false, reason: "vague label-detail phrasing" };
  }
  if (/\bOne supplements\b/i.test(title)) {
    return { ok: false, reason: "plural after One" };
  }
  if (/\bOne [A-Z][a-z]+(?:\s+[a-z]+)? check\b/.test(title)) {
    return { ok: false, reason: "unnatural One-ingredient check" };
  }
  if (/\bWhy (?!comparing )\S+ gets\b/i.test(title)) {
    return { ok: false, reason: "plural/subject verb mismatch without comparing" };
  }
  if (hasMedicalOrStudyClaim(title)) {
    return { ok: false, reason: "medical/study claim" };
  }
  const outcomeSafety = outcomeClaimSafety(title);
  if (!outcomeSafety.ok) {
    return { ok: false, reason: outcomeSafety.reason };
  }
  if (hasNewNumbers(title, `${framedTitle} ${seed.subject}`)) {
    return { ok: false, reason: "new number introduced" };
  }
  if (!subjectTokensPresent(seed.subject, title)) {
    const significant = seed.subject
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length >= 4)
      .slice(0, 6);
    const hit = significant.some((t) => title.toLowerCase().includes(t));
    // Allow attribute-focused titles that keep comparison nouns from seed
    const attrHit =
      /price|serving|label|form|compare|comparison/i.test(seed.subject) &&
      /price|serving|label|form|compare|comparison|option|cheaper/i.test(
        title
      );
    if (!hit && !attrHit) {
      return { ok: false, reason: "subject tokens missing" };
    }
  }
  if (
    seed.sourceType === "industry_research" &&
    /\b\w+'s\b/i.test(title) &&
    /\b(product|catalog|sells)\b/i.test(title)
  ) {
    return { ok: false, reason: "brand-sells implication" };
  }
  return { ok: true };
}

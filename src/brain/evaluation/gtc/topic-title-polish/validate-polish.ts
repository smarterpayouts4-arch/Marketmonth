import {
  hasMedicalOrStudyClaim,
  hasNewNumbers,
  titleLengthOk,
  tokenizeEntities,
} from "../../creative-safety";
import { isMalformedSubjectLabel } from "../../subjects/subject-label";
import type { TopicCandidate } from "../../topic-candidate-types";
import type { TopicTitlePolishCandidateInput } from "./types";

const AFFILIATE_RE =
  /\b(i recommend|we recommend|doctor recommended|clinically proven|best|worst|guaranteed|miracle|secret|toxic|dangerous)\b/i;

const CROWD_RE =
  /\b(most shoppers|everyone|nobody tells you|all buyers)\b/i;

const MEDICAL_EXTRA_RE =
  /\b(treat|cure|prevent|diagnose|heals?)\b/i;

/** Product-education shells that must not leak into brand_awareness. */
const BRAND_AWARENESS_PE_SHELL_RE =
  /\b(check the label|before you buy|serving size|price per serving)\b/i;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Subject preserved via exact label, normalized label, or approved aliases.
 * Model cannot invent aliases — only the allowlisted set counts.
 */
export function subjectPreservedWithAliases(
  primaryLabel: string,
  title: string,
  approvedAliases: string[]
): boolean {
  const titleNorm = normalize(title);
  const titleLower = title.toLowerCase();
  const checks = [
    primaryLabel.trim(),
    normalize(primaryLabel),
    ...approvedAliases,
  ].filter(Boolean);

  for (const alias of checks) {
    const a = alias.trim();
    if (!a) continue;
    if (titleLower.includes(a.toLowerCase())) return true;
    if (titleNorm.includes(normalize(a))) return true;
  }

  // Token overlap against aliases blob (significant tokens only)
  const aliasBlob = checks.join(" ");
  const required = [...tokenizeEntities(primaryLabel)]
    .filter(
      (t) =>
        !/^(with|from|that|this|what|when|your|their|about|before|after)$/.test(
          t
        )
    )
    .slice(0, 2);
  if (required.length === 0) return false;
  const titleTokens = tokenizeEntities(title);
  const aliasTokens = tokenizeEntities(aliasBlob);
  return required.every(
    (t) => titleTokens.has(t) || aliasTokens.has(t) || titleNorm.includes(t)
  );
}

function brandAwarenessLabelCheckAllowed(
  input: TopicTitlePolishCandidateInput
): boolean {
  return (
    input.primaryKind === "comparison_attribute" &&
    Boolean(input.comparisonAttribute?.trim())
  );
}

export function validatePolishedTitle(args: {
  candidate: TopicCandidate;
  polishInput: TopicTitlePolishCandidateInput;
  polishedTitle: string;
  otherAcceptedTitles: string[];
}): { ok: true } | { ok: false; reason: string } {
  const { candidate, polishInput, polishedTitle, otherAcceptedTitles } = args;
  const title = polishedTitle.trim();

  if (isMalformedSubjectLabel(candidate.subject.label)) {
    return { ok: false, reason: "malformed primary label — refuse polish" };
  }
  if (!titleLengthOk(title, 18, 100)) {
    return { ok: false, reason: "title length out of bounds" };
  }
  if (AFFILIATE_RE.test(title) || CROWD_RE.test(title)) {
    return { ok: false, reason: "affiliate or crowd claim" };
  }
  if (hasMedicalOrStudyClaim(title) || MEDICAL_EXTRA_RE.test(title)) {
    return { ok: false, reason: "medical/recommendation claim" };
  }
  if (
    hasNewNumbers(
      title,
      `${polishInput.originalTitle} ${polishInput.allowedFacts.join(" ")}`
    )
  ) {
    return { ok: false, reason: "new number introduced" };
  }
  if (
    candidate.objective === "brand_awareness" &&
    BRAND_AWARENESS_PE_SHELL_RE.test(title) &&
    !brandAwarenessLabelCheckAllowed(polishInput)
  ) {
    return {
      ok: false,
      reason: "brand_awareness product-education shell leak",
    };
  }
  if (
    !subjectPreservedWithAliases(
      polishInput.primaryLabel,
      title,
      polishInput.approvedAliases
    )
  ) {
    return { ok: false, reason: "subject/aliases not preserved" };
  }

  const key = title.toLowerCase();
  if (otherAcceptedTitles.some((t) => t.toLowerCase() === key)) {
    return { ok: false, reason: "duplicate title in batch" };
  }

  // Reject brand-new long capitalized tokens not in allowlist
  const allowed = new Set(
    [
      ...polishInput.allowedFacts,
      ...polishInput.approvedAliases,
      polishInput.primaryLabel,
      polishInput.originalTitle,
    ]
      .join(" ")
      .toLowerCase()
      .match(/[a-z][a-z0-9-]{3,}/g) ?? []
  );
  const titleWords = title.match(/\b[A-Z][a-zA-Z0-9-]{3,}\b/g) ?? [];
  for (const w of titleWords) {
    if (!allowed.has(w.toLowerCase()) && !/^(Why|What|How|The|Before|Buying)$/.test(w)) {
      // Allow sentence-start words; block novel proper nouns
      if (title.indexOf(w) > 0) {
        return { ok: false, reason: `new entity: ${w}` };
      }
    }
  }

  return { ok: true };
}

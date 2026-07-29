import type { TopicCategoryId } from "@/brain/content/topic-category";
import {
  hasMedicalOrStudyClaim,
  hasNewNumbers,
  outcomeClaimSafety,
  titleLengthOk,
} from "@/brain/evaluation/creative-safety";

import type { TopicEvidenceItem } from "../../evidence/types";
import { isGenericDecisionTitle } from "../text";
import { isMetaInstructionalPhrase } from "../../topic-meta";
import type { LlmTopicCandidateItem } from "./schema";
import type {
  LlmCandidateRejectionCode,
  ValidatedLlmTopicCandidate,
} from "./types";

const PRODUCT_NAME_ONLY_RE =
  /^[A-Z][A-Za-z0-9+/-]{0,24}(?:\s+[A-Z][A-Za-z0-9+/-]{0,24}){0,2}$/;

const VITAMIN_ALIAS_RE = /\b(?:vitamin\s+)?([bcdfjkmtw]\d{1,2})\b/i;
const OMEGA_ALIAS_RE = /\bomega[-\s]?3\b/i;

function normalizeToken(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9+/-]+/g, " ").trim();
}

function expandAliases(text: string): string[] {
  const out = new Set<string>([normalizeToken(text)]);
  const vitamin = text.match(VITAMIN_ALIAS_RE);
  if (vitamin?.[1]) {
    out.add(vitamin[1].toLowerCase());
    out.add(`vitamin ${vitamin[1].toLowerCase()}`);
  }
  if (OMEGA_ALIAS_RE.test(text)) {
    out.add("omega-3");
    out.add("omega 3");
  }
  return [...out];
}

function evidenceBlob(items: TopicEvidenceItem[]): string {
  return items
    .map((i) => `${i.normalizedText} ${i.value} ${i.field}`)
    .join(" ")
    .toLowerCase();
}

function observedSubjectTokens(items: TopicEvidenceItem[]): Set<string> {
  const tokens = new Set<string>();
  for (const item of items) {
    for (const alias of expandAliases(item.normalizedText)) {
      for (const word of alias.split(/\s+/).filter((w) => w.length >= 3)) {
        tokens.add(word);
      }
    }
    for (const alias of expandAliases(item.value)) {
      for (const word of alias.split(/\s+/).filter((w) => w.length >= 3)) {
        tokens.add(word);
      }
    }
  }
  return tokens;
}

function titleMatchesObservedSubjects(
  title: string,
  citedItems: TopicEvidenceItem[],
  allItems: TopicEvidenceItem[]
): boolean {
  const titleNorm = normalizeToken(title);
  const blob = evidenceBlob(citedItems.length ? citedItems : allItems);
  const subjects = observedSubjectTokens(
    citedItems.length ? citedItems : allItems
  );

  for (const alias of expandAliases(title)) {
    if (alias.length >= 4 && blob.includes(alias)) return true;
  }

  const titleWords = titleNorm.split(/\s+/).filter((w) => w.length >= 4);
  const hits = titleWords.filter(
    (w) => blob.includes(w) || subjects.has(w)
  ).length;
  if (hits >= 1) return true;

  // Omega-3 style: title mentions omega-3 and evidence has fish oil / DHA / EPA
  if (OMEGA_ALIAS_RE.test(title)) {
    if (/\b(omega|dha|epa|fish oil)\b/i.test(blob)) return true;
  }

  return titleWords.length === 0;
}

const QUESTION_LEAD_RE =
  /^(who|whose|what|when|where|why|how|which|does|do|did|is|are|was|were|can|could|should|would|will)\b/i;

/** Complete interrogative sentence, e.g. "Does ZYNAVA sell supplements?" */
function isCompleteQuestionTitle(title: string): boolean {
  const t = title.trim();
  return t.endsWith("?") && QUESTION_LEAD_RE.test(t);
}

function isIncompleteSentenceTitle(
  title: string,
  categoryId?: TopicCategoryId
): boolean {
  const t = title.trim();
  if (t.endsWith("?")) {
    // customer_questions exists to answer questions — a complete
    // interrogative title is the desired form there, not a defect.
    // (Verified live: the old blanket "?" rejection killed the whole
    // LLM path for that category.)
    if (categoryId === "customer_questions" && isCompleteQuestionTitle(t)) {
      return false;
    }
    return true;
  }
  if (/^(is|the)\s+[a-z]/i.test(t) && !/^(the difference|the label|the price)\b/i.test(t)) {
    return true;
  }
  return false;
}

function isProductNameOnlyTitle(title: string): boolean {
  const t = title.trim();
  if (t.split(/\s+/).length > 3) return false;
  return PRODUCT_NAME_ONLY_RE.test(t);
}

function parseConfidence(raw: LlmTopicCandidateItem["confidence"]): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Math.max(0, Math.min(1, raw));
  }
  if (typeof raw === "string") {
    const lower = raw.trim().toLowerCase();
    if (lower === "high") return 0.9;
    if (lower === "medium") return 0.65;
    if (lower === "low") return 0.35;
    const n = Number.parseFloat(lower);
    if (Number.isFinite(n)) return Math.max(0, Math.min(1, n));
  }
  return undefined;
}

function resolveEvidenceRefs(
  refs: string[],
  sentEvidenceIds: Set<string>,
  displayToRealId: Map<string, string>
): string[] | null {
  const resolved: string[] = [];
  for (const ref of refs) {
    const trimmed = ref.trim();
    if (!sentEvidenceIds.has(trimmed)) return null;
    const real = displayToRealId.get(trimmed);
    if (!real) return null;
    resolved.push(real);
  }
  return [...new Set(resolved)];
}

export type ValidateLlmCandidateArgs = {
  candidate: LlmTopicCandidateItem;
  sentEvidenceIds: Set<string>;
  displayToRealId: Map<string, string>;
  evidenceById: Map<string, TopicEvidenceItem>;
  allEvidenceItems: TopicEvidenceItem[];
  /** Category-fitness gating and question-form title rules. */
  categoryId?: TopicCategoryId;
};

export type ValidateLlmCandidateResult =
  | { ok: true; value: ValidatedLlmTopicCandidate }
  | { ok: false; code: LlmCandidateRejectionCode; reason: string };

function reject(
  code: LlmCandidateRejectionCode,
  reason: string
): ValidateLlmCandidateResult {
  return { ok: false, code, reason };
}

/**
 * Creative-field safety on a non-title field. Returns a reason when the
 * field carries an unsafe claim or a number that is not in evidence.
 */
function unsafeFieldReason(text: string, evidence: string): string | null {
  if (hasMedicalOrStudyClaim(text)) return "medical or study claim";
  const outcome = outcomeClaimSafety(text);
  if (!outcome.ok) return outcome.reason;
  if (hasNewNumbers(text, evidence)) return "number not present in evidence";
  return null;
}

export function validateLlmTopicCandidate(
  args: ValidateLlmCandidateArgs
): ValidateLlmCandidateResult {
  const {
    candidate,
    sentEvidenceIds,
    displayToRealId,
    evidenceById,
    allEvidenceItems,
    categoryId,
  } = args;
  const title = candidate.title.trim();

  if (!titleLengthOk(title, 24, 90)) {
    return reject("title_length", "title length out of bounds");
  }
  if (isGenericDecisionTitle(title) || isMetaInstructionalPhrase(title)) {
    return reject(
      "generic_or_meta_title",
      "generic or meta-instructional title"
    );
  }
  if (isIncompleteSentenceTitle(title, categoryId)) {
    return reject("incomplete_sentence_title", "incomplete sentence title");
  }
  if (isProductNameOnlyTitle(title)) {
    return reject("product_name_only_title", "product-name-only title");
  }
  if (hasMedicalOrStudyClaim(title)) {
    return reject("medical_or_study_claim", "medical or study claim");
  }
  const outcomeSafety = outcomeClaimSafety(title);
  if (!outcomeSafety.ok) {
    return reject("outcome_claim_unattributed", outcomeSafety.reason);
  }

  const evidenceRefs = resolveEvidenceRefs(
    candidate.evidenceRefs,
    sentEvidenceIds,
    displayToRealId
  );
  if (!evidenceRefs?.length) {
    return reject("evidence_refs_invalid", "evidenceRefs not in sent id set");
  }

  const citedItems = evidenceRefs
    .map((id) => evidenceById.get(id))
    .filter((i): i is TopicEvidenceItem => Boolean(i));

  if (!titleMatchesObservedSubjects(title, citedItems, allEvidenceItems)) {
    return reject(
      "subject_mismatch",
      "title not grounded in cited evidence subjects"
    );
  }

  const evidence = evidenceBlob(citedItems.length ? citedItems : allEvidenceItems);

  // Number provenance on the title (certs are already blocked by the
  // medical/study/cert claim gate above).
  if (hasNewNumbers(title, evidence)) {
    return reject("ungrounded_number", "title number not present in evidence");
  }

  // Category-fitness gate: customer_questions must answer a question.
  const audienceQuestion = candidate.audienceQuestion?.trim() || undefined;
  if (
    categoryId === "customer_questions" &&
    !isCompleteQuestionTitle(title) &&
    !audienceQuestion
  ) {
    return reject(
      "category_mismatch",
      "customer_questions candidate has neither a question-form title nor an audienceQuestion"
    );
  }

  // Field-level safety: required creative fields reject the candidate;
  // optional ones are dropped rather than sinking the whole candidate.
  const strategicAngle = candidate.strategicAngle.trim();
  const whyItFits = candidate.whyItFits.trim();
  for (const [field, text] of [
    ["strategicAngle", strategicAngle],
    ["whyItFits", whyItFits],
  ] as const) {
    const unsafe = unsafeFieldReason(text, evidence);
    if (unsafe) {
      return reject("unsafe_creative_field", `${field}: ${unsafe}`);
    }
  }
  const hook = candidate.hook?.trim() || undefined;
  const safeHook = hook && !unsafeFieldReason(hook, evidence) ? hook : undefined;
  const safeAudienceQuestion =
    audienceQuestion && !unsafeFieldReason(audienceQuestion, evidence)
      ? audienceQuestion
      : undefined;

  return {
    ok: true,
    value: {
      title,
      hook: safeHook,
      audienceQuestion: safeAudienceQuestion,
      strategicAngle,
      whyItFits,
      suggestedFormats: candidate.suggestedFormats?.map((s) => s.trim()).filter(Boolean),
      platformFit: candidate.platformFit?.map((s) => s.trim()).filter(Boolean),
      funnelRole: candidate.funnelRole?.trim() || undefined,
      evidenceRefs,
      itchType: candidate.itchType?.trim() || undefined,
      confidence: parseConfidence(candidate.confidence),
    },
  };
}

export const __testables = {
  isIncompleteSentenceTitle,
  isCompleteQuestionTitle,
  isProductNameOnlyTitle,
  titleMatchesObservedSubjects,
  expandAliases,
};

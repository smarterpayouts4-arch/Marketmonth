import type { ContentBrainContext } from "@/brain/content/types";
import type { MarketingFocus } from "@/brain/content/marketing-focus";

import { isMalformedSubjectLabel } from "../../subjects/subject-label";
import type { TopicCandidate } from "../../topic-candidate-types";
import { buildTopicTitlePolishSystemPrompt } from "./playbook";
import type {
  TopicTitlePolishCandidateInput,
  TopicTitlePolishInput,
} from "./types";
import { TOPIC_TITLE_POLISH_VERSION } from "./types";

/**
 * Grounded aliases only — never invented by the model.
 */
export function approvedAliasesForCandidate(
  candidate: TopicCandidate,
  companyName?: string
): string[] {
  const aliases = new Set<string>();
  const label = candidate.subject.label.trim();
  if (label) {
    aliases.add(label);
    aliases.add(label.toLowerCase());
    const normalized = label
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (normalized) aliases.add(normalized);
  }
  if (companyName?.trim()) {
    aliases.add(companyName.trim());
    aliases.add(companyName.trim().toLowerCase());
  }
  // Kind-derived grounded phrases already on the candidate
  if (candidate.subjectKind === "platform_capability") {
    for (const part of label.split(/\s+/)) {
      if (part.length >= 4) aliases.add(part.toLowerCase());
    }
  }
  if (candidate.subjectKind === "comparison_attribute") {
    if (/price\s+per\s+serving/i.test(label)) {
      aliases.add("price per serving");
    }
    if (/serving\s+size/i.test(label)) aliases.add("serving size");
    if (/\blabel\b/i.test(label)) aliases.add("label");
  }
  // Common grounded rephrasings only when label contains the stem
  if (/\bsearch\b/i.test(label)) {
    aliases.add("finding supplement information");
    aliases.add("supplement search");
  }
  if (/\bcompar/i.test(label) && candidate.subjectKind !== "audience_problem") {
    aliases.add("comparing supplements");
  }
  return [...aliases].filter(Boolean);
}

function comparisonAttributeFrom(candidate: TopicCandidate): string | undefined {
  if (candidate.subjectKind !== "comparison_attribute") return undefined;
  const label = candidate.subject.label;
  if (/price\s+per\s+serving/i.test(label)) return "price per serving";
  if (/serving\s+size/i.test(label)) return "serving size";
  if (/\blabel\b/i.test(label)) return "label";
  return label;
}

export function toTopicTitlePolishInput(
  candidates: TopicCandidate[],
  context: ContentBrainContext,
  objective: MarketingFocus
): TopicTitlePolishInput {
  const companyName = context.brandName;
  const packed: TopicTitlePolishCandidateInput[] = candidates.map((c) => {
    const label = c.subject.label;
    const allowedFacts = [
      label,
      companyName,
      ...(c.subjectKind === "comparison_attribute" ? [label] : []),
    ].filter(Boolean);

    return {
      candidateId: c.topicId,
      originalTitle: c.originalTitle ?? c.title,
      primaryLabel: label,
      primaryKind: c.subjectKind,
      comparisonAttribute: comparisonAttributeFrom(c),
      audienceProblem:
        c.subjectKind === "audience_problem" ? label : undefined,
      platformCapability:
        c.subjectKind === "platform_capability" ? label : undefined,
      brandPosition: c.subjectKind === "brand_position" ? label : undefined,
      allowedFacts: [...new Set(allowedFacts)],
      approvedAliases: approvedAliasesForCandidate(c, companyName),
      forbiddenEntities: [],
    };
  });

  return {
    objective,
    companyName,
    companyCategory: undefined,
    candidates: packed,
  };
}

export function buildTopicTitlePolishMessages(input: TopicTitlePolishInput): {
  system: string;
  user: string;
} {
  const system = buildTopicTitlePolishSystemPrompt(input.objective);
  const user = JSON.stringify({
    schemaVersion: TOPIC_TITLE_POLISH_VERSION,
    objective: input.objective,
    companyName: input.companyName ?? null,
    companyCategory: input.companyCategory ?? null,
    instruction:
      "Polish each title. Preserve meaning. Use only allowedFacts and approvedAliases. Return every candidateId.",
    candidates: input.candidates,
  });
  return { system, user };
}

/** Skip polish for candidates that should never have been ranked. */
export function candidateEligibleForPolish(candidate: TopicCandidate): boolean {
  return !isMalformedSubjectLabel(candidate.subject.label);
}

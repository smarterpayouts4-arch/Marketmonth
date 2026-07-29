import {
  TOPIC_CATEGORY_LABELS,
  topicCategoryPurposeLine,
  type TopicCategoryId,
} from "@/brain/content/topic-category";
import type { ContentBrainContext } from "@/brain/content/types";

import type { TopicEvidenceItem } from "../../evidence/types";

export const REQUESTED_CANDIDATE_COUNT = 12;

export type EvidencePromptBundle = {
  /** Display ids sent to the model (E01, E02, …). */
  sentEvidenceIds: Set<string>;
  /** Map display id → canonical evidence id. */
  displayToRealId: Map<string, string>;
  userPrompt: string;
};

function displayIdForIndex(index: number): string {
  return `E${String(index + 1).padStart(2, "0")}`;
}

function formatEvidenceLine(item: TopicEvidenceItem, displayId: string): string {
  const value = item.normalizedText.trim().slice(0, 280);
  const url = item.sourceUrl?.trim() || "(none)";
  return `${displayId} | ${item.signalType} | ${item.evidenceType} | ${item.confidence} | ${value} | ${url}`;
}

export function buildTopicCandidatePrompt(args: {
  context: ContentBrainContext;
  categoryId: TopicCategoryId;
  evidenceItems: TopicEvidenceItem[];
}): EvidencePromptBundle {
  const { context, categoryId, evidenceItems } = args;
  const sentEvidenceIds = new Set<string>();
  const displayToRealId = new Map<string, string>();

  const lines: string[] = [];
  lines.push("BUSINESS IDENTITY");
  lines.push(`name: ${context.brandName}`);
  lines.push(`website: ${context.website ?? "(none)"}`);
  lines.push(`what it does: ${context.description ?? "(none)"}`);
  lines.push(`value proposition: ${context.valueProposition ?? "(none)"}`);
  lines.push(`brand voice: ${context.brandVoice ?? "(none)"}`);
  lines.push("");
  lines.push(`CATEGORY: ${TOPIC_CATEGORY_LABELS[categoryId]}`);
  lines.push(`PURPOSE: ${topicCategoryPurposeLine(categoryId)}`);
  lines.push("");
  lines.push("EVIDENCE (cite ids exactly as shown in evidenceRefs)");
  for (const [i, item] of evidenceItems.entries()) {
    const displayId = displayIdForIndex(i);
    sentEvidenceIds.add(displayId);
    displayToRealId.set(displayId, item.id);
    lines.push(formatEvidenceLine(item, displayId));
  }
  lines.push("");
  lines.push(
    `Generate ${REQUESTED_CANDIDATE_COUNT} distinct topic candidates. JSON only.`
  );

  return {
    sentEvidenceIds,
    displayToRealId,
    userPrompt: lines.join("\n"),
  };
}

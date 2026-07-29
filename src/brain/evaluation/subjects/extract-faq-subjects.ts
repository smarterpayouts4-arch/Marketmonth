import type { ContentBrainContext } from "@/brain/content/types";

import {
  evidenceForField,
  normalizeOpportunityLabel,
  pushUnique,
} from "./helpers";
import type { TopicSubject } from "./types";

const CHROME = /How It Works|ContactMore|how we work\./i;

/**
 * FAQ / education subjects from evidence rows (field=faq).
 */
export function extractFaqSubjects(
  context: ContentBrainContext
): TopicSubject[] {
  const out: TopicSubject[] = [];
  for (const ev of Object.values(context.evidenceById)) {
    if (ev.field !== "faq") continue;
    if (CHROME.test(ev.value)) continue;
    const qMatch = ev.value.match(
      /(?:^|\bQ:\s*)([^?]{8,120}\?)/i
    );
    const labelRaw = qMatch?.[1] ?? ev.value.slice(0, 120);
    const label = normalizeOpportunityLabel(labelRaw.replace(/^Q:\s*/i, ""));
    if (!label || label.length < 8) continue;
    pushUnique(out, {
      label,
      kind: "faq_topic",
      sourceField: "faq",
      evidenceIds: evidenceForField(context, "faq").slice(0, 3),
      classificationReason: "FAQ evidence supports trust/education topic",
      classificationConfidence:
        ev.confidence === "high"
          ? "high"
          : ev.confidence === "medium"
            ? "medium"
            : "low",
    });
  }
  return out.slice(0, 8);
}

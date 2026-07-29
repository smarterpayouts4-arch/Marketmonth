import type { ContentBrainContext } from "@/brain/content/types";

import { clampLabel, evidenceForField, pushUnique } from "./helpers";
import {
  isOutcomeEvidenceField,
  pairOutcomeSubjectsFromCorpus,
} from "./eos/pair";
import type { OutcomePair } from "./eos/types";
import type { TopicSubject } from "./types";

function formatOutcomeLabel(pair: OutcomePair): string {
  if (pair.descriptor.trim()) {
    return clampLabel(`${pair.ingredient} — ${pair.descriptor}`, 56);
  }
  return clampLabel(`${pair.ingredient} → ${pair.outcome}`, 56);
}

function collectOutcomeSources(
  context: ContentBrainContext
): Array<{ text: string; sourceField: string; evidenceIds: string[] }> {
  const sources: Array<{
    text: string;
    sourceField: string;
    evidenceIds: string[];
  }> = [];
  const seenText = new Set<string>();

  const push = (text: string, sourceField: string, evidenceIds: string[]) => {
    const key = text.trim().slice(0, 120);
    if (!key || seenText.has(key)) return;
    seenText.add(key);
    sources.push({ text, sourceField, evidenceIds });
  };

  const productText = context.signals?.productText?.trim();
  if (productText) {
    push(
      productText,
      "signals.productText",
      evidenceForField(context, "productsServices").length
        ? evidenceForField(context, "productsServices")
        : evidenceForField(context, productText.slice(0, 24))
    );
  }

  for (const [id, ev] of Object.entries(context.evidenceById)) {
    if (!isOutcomeEvidenceField(ev.field)) continue;
    push(ev.value, ev.field, [id]);
  }

  return sources;
}

export function extractOutcomePairs(
  context: ContentBrainContext
): OutcomePair[] {
  return pairOutcomeSubjectsFromCorpus(collectOutcomeSources(context));
}

export function extractOutcomeSubjects(
  context: ContentBrainContext
): TopicSubject[] {
  const out: TopicSubject[] = [];
  for (const pair of extractOutcomePairs(context)) {
    if (!pair.evidenceIds.length) continue;
    pushUnique(out, {
      label: formatOutcomeLabel(pair),
      kind: "health_outcome",
      sourceField: pair.sourceField,
      evidenceIds: pair.evidenceIds,
      classificationReason:
        "Determiner-led offering→descriptor pair from segmented product copy",
      classificationConfidence: "high",
    });
  }
  return out;
}

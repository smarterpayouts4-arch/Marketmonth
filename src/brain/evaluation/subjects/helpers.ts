import type { ContentBrainContext } from "@/brain/content/types";

import { isMetaInstructionalPhrase } from "../topic-meta";
import {
  isMalformedSubjectLabel,
  normalizeOpportunityLabel,
} from "./subject-label";
import type { TopicSubject } from "./types";

export function normalizeCategoryLabel(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (lower === "supplement") return "supplements";
  if (lower === "vitamin") return "vitamins";
  if (lower === "mineral") return "minerals";
  if (lower === "product category") return "product category";
  return raw.trim().toLowerCase() === raw.trim() ? lower : raw.trim();
}

export function countLabelMentions(
  context: ContentBrainContext,
  label: string
): number {
  const needle = label.toLowerCase();
  let n = 0;
  for (const p of context.products) {
    if (p.toLowerCase().includes(needle)) n += 1;
  }
  for (const o of context.contentOpportunities) {
    if (o.toLowerCase().includes(needle)) n += 1;
  }
  for (const ev of Object.values(context.evidenceById)) {
    const blob = `${ev.field} ${ev.value} ${ev.sourceSnippet}`.toLowerCase();
    if (blob.includes(needle)) n += 1;
  }
  return n;
}

export { clampLabel } from "./label-text";

export function evidenceForField(
  context: ContentBrainContext,
  fieldHint: string
): string[] {
  const hint = fieldHint.toLowerCase().slice(0, 24);
  const ids = Object.entries(context.evidenceById)
    .filter(([, ev]) => {
      const blob = `${ev.field} ${ev.value} ${ev.sourceSnippet}`.toLowerCase();
      return blob.includes(hint);
    })
    .map(([id]) => id)
    .slice(0, 3);
  if (ids.length > 0) return ids;
  return Object.keys(context.evidenceById).slice(0, 2);
}

export function pushUnique(out: TopicSubject[], subject: TopicSubject): void {
  const key = `${subject.kind}|${subject.label.toLowerCase()}`;
  if (out.some((s) => `${s.kind}|${s.label.toLowerCase()}` === key)) return;
  if (!subject.label || isMetaInstructionalPhrase(subject.label)) return;
  // Defense in depth — malformed labels never enter the ranked list
  if (isMalformedSubjectLabel(subject.label)) return;
  out.push(subject);
}

export { isMalformedSubjectLabel, normalizeOpportunityLabel };

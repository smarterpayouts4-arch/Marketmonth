import type { ContentBrainContext } from "@/brain/content/types";
import { dualSubjectFromLabel } from "@/brain/content/subject-shape";

import { isMetaInstructionalPhrase } from "../topic-meta";
import {
  isMalformedSubjectLabel,
  normalizeOpportunityLabel,
} from "./subject-label";
import {
  analyzeMalformedSubject,
  logSubjectRejection,
} from "./subject-rejection";
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
  // No arbitrary backfill — unlinked subjects get empty evidence and may be dropped.
  return ids;
}

export function pushUnique(out: TopicSubject[], subject: TopicSubject): void {
  const key = `${subject.kind}|${subject.label.toLowerCase()}`;
  if (out.some((s) => `${s.kind}|${s.label.toLowerCase()}` === key)) return;
  if (!subject.label || isMetaInstructionalPhrase(subject.label)) return;
  const analysis = analyzeMalformedSubject(subject.label);
  if (analysis.malformed) {
    logSubjectRejection({
      candidate: subject.label,
      reason: analysis.reason,
      repeatedHead: analysis.repeatedHead,
      itemCount: analysis.itemCount,
      sourceField: subject.sourceField,
    });
    return;
  }
  // No evidence-free subjects — empty backfill was removed from evidenceForField
  if (!subject.evidenceIds?.length) return;
  const dual = dualSubjectFromLabel(subject.rawSubject ?? subject.label);
  out.push({
    ...subject,
    rawSubject: subject.rawSubject ?? dual.rawSubject,
    normalizedSubject: subject.normalizedSubject ?? dual.normalizedSubject,
    subjectShape: subject.subjectShape ?? dual.subjectShape,
  });
}

export { isMalformedSubjectLabel, normalizeOpportunityLabel };

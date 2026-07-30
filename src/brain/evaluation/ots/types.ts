import type { ContentBrainContext } from "@/brain/content/types";

import type { TopicSubject, TopicSubjectKind } from "../topic-subject";

export type TopicSeed = {
  subject: string;
  subjectType: TopicSubjectKind;
  audienceNeed?: string;
  evidenceIds: string[];
  sourceFields: string[];
  classificationReason: string;
  classificationConfidence: "high" | "medium" | "low";
  frameHint: string;
  sourceType?: "brand_observed" | "industry_research";
  supportFamilyKey?: string;
  /** Original subject wording (FAQ question, etc.). */
  rawSubject?: string;
  /** Noun form for shells. */
  normalizedSubject?: string;
  subjectShape?: "question" | "noun" | "other";
  /**
   * Title-derived intent bucket for display-intent dedupe. Set for LLM
   * candidates so distinct angles on one subject don't all collapse into
   * the generic_label_check bucket.
   */
  displayIntentHint?: string;
};

export type CategoryTopicStrategy = (
  context: ContentBrainContext,
  subjects: TopicSubject[]
) => TopicSeed[];

export function seedFrom(
  s: TopicSubject,
  frameHint: string,
  audienceNeed?: string
): TopicSeed {
  return {
    subject: s.label,
    subjectType: s.kind,
    audienceNeed,
    evidenceIds: [...s.evidenceIds],
    sourceFields: [s.sourceField],
    classificationReason: s.classificationReason,
    classificationConfidence: s.classificationConfidence,
    frameHint,
    sourceType: s.sourceType ?? "brand_observed",
    supportFamilyKey: s.supportFamilyKey,
    rawSubject: s.rawSubject ?? s.label,
    normalizedSubject: s.normalizedSubject ?? s.label,
    subjectShape: s.subjectShape,
  };
}

export function ofKind(
  subjects: TopicSubject[],
  kinds: TopicSubjectKind[]
): TopicSubject[] {
  return subjects.filter((s) => kinds.includes(s.kind));
}

/** The audience need every strategy hangs its framing on. */
export function audienceNeedFrom(subjects: TopicSubject[]): string | undefined {
  return ofKind(subjects, ["audience_problem"])[0]?.label;
}

export function dedupeSeeds(seeds: TopicSeed[]): TopicSeed[] {
  const seen = new Set<string>();
  const out: TopicSeed[] = [];
  for (const s of seeds) {
    const key = `${s.subjectType}|${s.subject.toLowerCase()}|${s.frameHint}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

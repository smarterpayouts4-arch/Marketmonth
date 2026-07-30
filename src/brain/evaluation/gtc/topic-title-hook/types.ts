import type { TopicSubjectKind } from "../../subjects/types";

export const TOPIC_TITLE_HOOK_VERSION = "topic-title-hook-v2" as const;

export type TopicTitleItchType =
  | "missing_detail"
  | "uncertainty"
  | "anticipation"
  | "ability_cue"
  | "passthrough";

export type TopicTitleHookProviderUsed = "deterministic-v1";

export type TopicFrameHint = string;

/** Built from classified seed metadata — regex in templates is fallback only. */
export type TopicTitleHookContext = {
  primaryLabel: string;
  primaryKind: TopicSubjectKind;
  actionObject?: string;
  comparisonAttribute?: string;
  categoryLabel?: string;
  frameHint: TopicFrameHint;
  evidenceIds: string[];
  rawSubject?: string;
  normalizedSubject?: string;
  subjectShape?: "question" | "noun" | "other";
};

export type TopicTitleHookResult = {
  title: string;
  itchType: TopicTitleItchType;
  providerUsed: TopicTitleHookProviderUsed;
  titleHookVersion: typeof TOPIC_TITLE_HOOK_VERSION;
  /** True when framed title was kept (validation fail or passthrough). */
  fellBack: boolean;
};

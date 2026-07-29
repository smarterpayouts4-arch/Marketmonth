import {
  buildTrace,
  startTimer,
} from "@/brain/evaluation/build-idea-lab-trace";
import type { SelectedTopicContext } from "@/brain/content/direction-writing-context";
import type { TopicCategoryId } from "@/brain/content/topic-category";

export type TraceDraft = Parameters<typeof buildTrace>[0][number];
export type TraceDrafts = Parameters<typeof buildTrace>[0];
export type RunTimer = ReturnType<typeof startTimer>;

export type RunIdeaLabInput = {
  /**
   * Lab six-idea generation is always from a selected/typed topic (manual).
   * Auto → six is removed; use runIdeaLabTopicCandidates first.
   */
  topicMode?: "auto" | "manual";
  /** @deprecated Prefer selectedTopicContext.masterTitle (exact). */
  manualTopic?: string;
  topicCategory?: unknown;
  selectedCandidateId?: string;
  selectedTopicContext?: SelectedTopicContext;
  /** Required unless fixturePath is set — never silently defaults to another brand. */
  companyId?: string;
  fixturePath?: string;
};

export type GatedDirectionsInput = {
  topicMode: "manual";
  topicCategory: TopicCategoryId;
  selectedTopicContext: SelectedTopicContext;
};

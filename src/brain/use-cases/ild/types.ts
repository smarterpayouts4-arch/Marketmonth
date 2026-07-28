import {
  buildTrace,
  startTimer,
} from "@/brain/evaluation/build-idea-lab-trace";
import type { SelectedTopicContext } from "@/brain/content/direction-writing-context";
import type { MarketingFocus } from "@/brain/content/marketing-focus";

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
  marketingFocus?: unknown;
  selectedCandidateId?: string;
  selectedTopicContext?: SelectedTopicContext;
  fixturePath?: string;
};

export type GatedDirectionsInput = {
  topicMode: "manual";
  marketingFocus: MarketingFocus;
  selectedTopicContext: SelectedTopicContext;
};

import {
  selectedTopicContextSchema,
  type SelectedTopicContext,
} from "@/brain/content/direction-writing-context";
import {
  parseTopicCategory,
  type TopicCategoryId,
} from "@/brain/content/topic-category";
import { TOPIC_OBJECTIVE_REQUIRED } from "@/brain/evaluation/topic-candidate-types";

import { finalizeFailedRun } from "./finalize-failed";
import type {
  GatedDirectionsInput,
  RunIdeaLabInput,
  RunTimer,
  TraceDrafts,
} from "./types";
import type { IdeaLabRun } from "@/brain/evaluation/idea-lab.types";

const PUBLIC_MODULE = "src/brain/use-cases/run-idea-lab-directions.ts";

export type GateResult =
  | { ok: true; value: GatedDirectionsInput }
  | { ok: false; run: IdeaLabRun };

/**
 * Topic-mode / objective / selected-topic gates.
 * Failures return a finalized IdeaLabRun (persist: false for gate errors).
 */
export async function gateIdeaLabDirections(args: {
  input: RunIdeaLabInput;
  runId: string;
  runStarted: RunTimer;
  drafts: TraceDrafts;
  historyRepositoryPath: string;
  labHistoryRecordCountBefore: number;
}): Promise<GateResult> {
  const {
    input,
    runId,
    runStarted,
    drafts,
    historyRepositoryPath,
    labHistoryRecordCountBefore,
  } = args;

  if (input.topicMode === "auto" || input.topicMode === undefined) {
    const msg =
      "Idea Lab Auto-generate returns topic candidates first. Select a candidate, then generate six directions.";
    drafts.push({
      stage: "Topic objective gate",
      modulePath: PUBLIC_MODULE,
      symbol: "runIdeaLabDirections",
      status: "error",
      warnings: [msg],
    });
    return {
      ok: false,
      run: await finalizeFailedRun({
        runId,
        runStarted,
        drafts,
        historyRepositoryPath,
        labHistoryRecordCountBefore,
        errors: [msg],
        fixtureHash: "",
        topicMode: "auto",
        persist: false,
      }),
    };
  }

  const focusParsed = parseTopicCategory(input.topicCategory);
  if (!focusParsed.ok || !focusParsed.value) {
    const msg =
      focusParsed.ok === false
        ? focusParsed.error
        : "Please select what you want this topic to accomplish.";
    drafts.push({
      stage: "Topic objective gate",
      modulePath: PUBLIC_MODULE,
      symbol: TOPIC_OBJECTIVE_REQUIRED,
      status: "error",
      warnings: [msg],
    });
    return {
      ok: false,
      run: await finalizeFailedRun({
        runId,
        runStarted,
        drafts,
        historyRepositoryPath,
        labHistoryRecordCountBefore,
        errors: [TOPIC_OBJECTIVE_REQUIRED, msg],
        fixtureHash: "",
        topicMode: "manual",
        persist: false,
      }),
    };
  }
  const topicCategory: TopicCategoryId = focusParsed.value;

  let selectedTopicContext: SelectedTopicContext | undefined =
    input.selectedTopicContext;
  if (selectedTopicContext) {
    const parsed = selectedTopicContextSchema.safeParse(selectedTopicContext);
    if (!parsed.success) {
      const msg =
        parsed.error.issues[0]?.message ?? "Invalid selectedTopicContext";
      return {
        ok: false,
        run: await finalizeFailedRun({
          runId,
          runStarted,
          drafts,
          historyRepositoryPath,
          labHistoryRecordCountBefore,
          errors: [msg],
          fixtureHash: "",
          topicMode: "manual",
          persist: false,
        }),
      };
    }
    selectedTopicContext = {
      ...parsed.data,
      objective: topicCategory,
    };
  } else if (input.manualTopic != null && input.manualTopic.trim().length > 0) {
    selectedTopicContext = {
      topicId: input.selectedCandidateId ?? `manual_${runId}`,
      masterTitle: input.manualTopic,
      objective: topicCategory,
    };
  }

  if (!selectedTopicContext || !selectedTopicContext.masterTitle.trim()) {
    const msg = "selectedTopic is required to generate six directions";
    drafts.push({
      stage: "Selected topic gate",
      modulePath: PUBLIC_MODULE,
      status: "error",
      warnings: [msg],
    });
    return {
      ok: false,
      run: await finalizeFailedRun({
        runId,
        runStarted,
        drafts,
        historyRepositoryPath,
        labHistoryRecordCountBefore,
        errors: [msg],
        fixtureHash: "",
        topicMode: "manual",
        persist: false,
      }),
    };
  }

  return {
    ok: true,
    value: {
      topicMode: "manual",
      topicCategory,
      selectedTopicContext,
    },
  };
}

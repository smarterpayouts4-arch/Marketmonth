import {
  startTimer,
} from "@/brain/evaluation/build-idea-lab-trace";
import type { IdeaLabRun } from "@/brain/evaluation/idea-lab.types";
import {
  getIdeaLabHistoryPath,
  labHistoryRecordCount,
} from "@/brain/evaluation/idea-lab-store";

import {
  assertDev,
  buildAndPersistSuccessRun,
  gateIdeaLabDirections,
  loadAndParseIdeaLabFixture,
  runIdeaLabGenerateStage,
} from "./ild";
import type { RunIdeaLabInput, TraceDrafts } from "./ild/types";

export { inspectIdeaLabFixture } from "./ild";
export type { RunIdeaLabInput } from "./ild/types";

/**
 * Idea Lab directions orchestrator (public entry).
 * Stages live under `ild/` — do not import those from app routes.
 */
export async function runIdeaLabDirections(
  input: RunIdeaLabInput = {}
): Promise<IdeaLabRun> {
  assertDev();
  const runStarted = startTimer();
  const historyRepositoryPath = getIdeaLabHistoryPath();
  const labHistoryRecordCountBefore = labHistoryRecordCount();
  const runId = `ilab_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const drafts: TraceDrafts = [];

  const gated = await gateIdeaLabDirections({
    input,
    runId,
    runStarted,
    drafts,
    historyRepositoryPath,
    labHistoryRecordCountBefore,
  });
  if (!gated.ok) return gated.run;

  const companyId = input.companyId?.trim();
  const fixturePath = input.fixturePath;
  if (!companyId && !fixturePath) {
    throw new Error(
      "runIdeaLabDirections: companyId or fixturePath is required (no silent default brand)"
    );
  }

  const loaded = await loadAndParseIdeaLabFixture({
    companyId: companyId || "ad-hoc",
    fixturePath,
    runId,
    runStarted,
    drafts,
    historyRepositoryPath,
    labHistoryRecordCountBefore,
  });
  if (!loaded.ok) return loaded.run;

  const generated = await runIdeaLabGenerateStage({
    context: loaded.value.context,
    brandCore: loaded.value.brandCore,
    identity: loaded.value.identity,
    selectedTopicContext: gated.value.selectedTopicContext,
    topicCategory: gated.value.topicCategory,
    selectedCandidateId: input.selectedCandidateId,
    fixturePath: loaded.value.fixturePath,
    hash: loaded.value.hash,
    historyRepositoryPath,
    runId,
    runStarted,
    drafts,
    labHistoryRecordCountBefore,
  });
  if (!generated.ok) return generated.run;

  return buildAndPersistSuccessRun({
    runId,
    runStarted,
    drafts,
    hash: loaded.value.hash,
    context: loaded.value.context,
    brandCore: loaded.value.brandCore,
    identity: loaded.value.identity,
    evidenceCount: loaded.value.evidenceCount,
    selectedTopicContext: gated.value.selectedTopicContext,
    historyRepositoryPath,
    labHistoryRecordCountBefore,
    outcome: generated.value.outcome,
    generationSucceeded: generated.value.generationSucceeded,
    warnings: generated.value.warnings,
  });
}

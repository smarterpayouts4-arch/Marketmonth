/**
 * Manual diagnostic — not wired in package.json.
 * Phase 2 Idea Lab baselines (dev only).
 * Cold (empty Lab history) then history-aware, same CSV + deterministic-directions-v1.
 */
import {
  labHistoryRecordCount,
  resetIdeaLabTopicHistory,
} from "../src/brain/evaluation/idea-lab-store";
import { runIdeaLabDirections } from "../src/brain/use-cases/run-idea-lab-directions";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Idea Lab baseline is production-impossible");
  }

  resetIdeaLabTopicHistory();
  console.log("COLD_HISTORY_COUNT", labHistoryRecordCount());

  const cold = await runIdeaLabDirections({ topicMode: "auto" });
  console.log("--- COLD BASELINE ---");
  console.log(
    JSON.stringify(
      {
        runId: cold.runId,
        fixtureHash: cold.input.fixtureHash,
        providerUsed: cold.input.providerUsed,
        generatorVersion: cold.input.generatorVersion,
        model: cold.input.model,
        promptVersion: cold.input.promptVersion,
        labHistoryRecordCountBefore: cold.input.labHistoryRecordCountBefore,
        historyPersisted: cold.historyPersisted,
        historyRepositoryPath: cold.input.historyRepositoryPath,
        brandCoreId: cold.brandCoreSummary.brandCoreId,
        brandCoreHash: cold.brandCoreSummary.brandCoreHash,
        usedAsPrimaryIdeaInput: cold.brandCoreSummary.usedAsPrimaryIdeaInput,
        masterTopic: cold.generation.masterTopic,
        ideas: cold.generation.ideas.map((i, n) => ({
          n: n + 1,
          id: i.id,
          topic: i.specificTopic || i.punchline,
          angle: i.angle,
          summary: (i.ideaSummary || i.brief).slice(0, 200),
          evidenceIds: i.evidenceIds,
        })),
        durationMs: cold.durationMs,
        errors: cold.errors,
      },
      null,
      2
    )
  );

  const histBefore = labHistoryRecordCount();
  const aware = await runIdeaLabDirections({ topicMode: "auto" });
  console.log("--- HISTORY-AWARE BASELINE ---");
  console.log(
    JSON.stringify(
      {
        runId: aware.runId,
        fixtureHash: aware.input.fixtureHash,
        generatorVersion: aware.input.generatorVersion,
        labHistoryRecordCountBefore: aware.input.labHistoryRecordCountBefore,
        historyPersisted: aware.historyPersisted,
        masterTopic: aware.generation.masterTopic,
        ideas: aware.generation.ideas.map((i, n) => ({
          n: n + 1,
          id: i.id,
          topic: i.specificTopic || i.punchline,
          angle: i.angle,
        })),
        durationMs: aware.durationMs,
        sameCsvHash: aware.input.fixtureHash === cold.input.fixtureHash,
        historyGrew:
          aware.input.labHistoryRecordCountBefore === histBefore &&
          histBefore > 0,
      },
      null,
      2
    )
  );

  console.log("IDEA LAB READY FOR REVIEW");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

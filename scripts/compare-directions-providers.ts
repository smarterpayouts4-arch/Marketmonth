/**
 * Local compare harness: same manual topic + same Brand Core hash.
 * Does not compare automatic vs automatic (too many variables).
 *
 * Usage:
 *   npm run compare:directions-providers
 *   npx tsx scripts/compare-directions-providers.ts --topic "Does magnesium actually help with sleep?"
 *
 * intelligent-v1 requires OPENAI_API_KEY. Without it, that arm records invalid + persists.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { generateAndRecordContentDirections } from "../src/brain/use-cases/generate-content-directions";
import { createTopicGenerationRepository } from "../src/brain/store/create-topic-generation-repository";

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const topic =
    argValue("--topic")?.trim() ||
    "Does magnesium actually help with sleep?";
  const domain = argValue("--domain")?.trim() || "zynava.com";
  const fixturePath =
    argValue("--fixture")?.trim() || "data/companies/zynava.com/approved.csv";

  const comparison_group_id = `cmp_${Date.now().toString(36)}`;
  const outDir = path.join(process.cwd(), "tmp", "directions-compare");
  mkdirSync(outDir, { recursive: true });
  const historyPath = path.join(outDir, `${comparison_group_id}.csv`);
  const repository = createTopicGenerationRepository({ filePath: historyPath });

  const providers = ["deterministic-v1", "intelligent-v1"] as const;
  const arms: unknown[] = [];

  for (const provider of providers) {
    const started = Date.now();
    const outcome = await generateAndRecordContentDirections({
      domain,
      mode: "manual",
      topic,
      fixturePath,
      generationMode: "evaluation",
      runPurpose: "benchmark",
      comparisonGroupId: comparison_group_id,
      experimentId: `${comparison_group_id}_${provider}`,
      directionsProvider: provider,
      repository,
    });
    const duration_ms = Date.now() - started;

    if (!outcome.ok) {
      arms.push({
        comparison_group_id,
        provider_id: provider,
        ok: false,
        error: outcome.error,
        duration_ms,
      });
      continue;
    }

    arms.push({
      comparison_group_id,
      provider_id: outcome.provider,
      brand_core_id: outcome.brandCoreId,
      brand_core_hash: outcome.brandCoreHash,
      input_topic: topic,
      generation_id: outcome.generationId,
      result_status: outcome.result.status,
      validation_ok: outcome.validationOk,
      history_persisted: outcome.historyPersisted,
      history_error: outcome.historyError,
      duration_ms,
      variation_count:
        outcome.result.status === "blocked"
          ? 0
          : outcome.result.variations.length,
      master_topic:
        outcome.result.status === "blocked"
          ? null
          : outcome.result.masterTopic.punchline,
    });
  }

  const report = {
    comparison_group_id,
    input_topic: topic,
    domain,
    fixturePath,
    note: "Manual fixed topic only — do not compare auto vs auto in v1.",
    arms,
  };

  const reportPath = path.join(outDir, `${comparison_group_id}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${reportPath}`);
  console.log(`History CSV: ${historyPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

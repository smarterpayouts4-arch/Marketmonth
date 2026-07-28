#!/usr/bin/env npx tsx
/**
 * Developer tool: compare Topic Generation History runs via Brain repository only.
 *
 * Usage:
 *   npx tsx scripts/compare-topic-generations.ts --company zynava.com --topic "Magnesium"
 */

import { normalizeInputTopic } from "../src/brain/content/normalize-topic";
import { createTopicGenerationRepository } from "../src/brain/store/create-topic-generation-repository";

function arg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

async function main(): Promise<void> {
  const company = (arg("--company") || "zynava.com").trim().toLowerCase();
  const topic = arg("--topic");
  if (!topic?.trim()) {
    console.error("Missing --topic");
    process.exit(1);
  }

  const repo = createTopicGenerationRepository();
  const normalized = normalizeInputTopic(topic);
  const runs = await repo.listByNormalizedTopic({
    companyId: company,
    normalizedTopic: normalized,
  });

  if (runs.length === 0) {
    console.log(`No runs for company=${company} topic=${normalized}`);
    return;
  }

  for (const run of runs) {
    console.log("─".repeat(72));
    console.log(`generation_id: ${run.generation_id}`);
    console.log(`created_at:    ${run.created_at}`);
    console.log(
      `brain/prompt:  ${run.generation_provenance.brain_version} / ${run.generation_provenance.prompt_version}`
    );
    console.log(
      `provider:      ${run.generation_provenance.provider}${
        run.generation_provenance.model
          ? ` (${run.generation_provenance.model})`
          : ""
      }`
    );
    console.log(
      `brand_core:    ${run.brand_core_id} v${run.brand_core_version} hash=${run.brand_core_hash}`
    );
    console.log(`mode/purpose:  ${run.mode} / ${run.run_purpose}`);
    console.log(`master_topic:  ${run.master_topic}`);
    console.log("directions:");
    for (const d of run.directions) {
      console.log(`  ${d.position}. ${d.specific_topic}`);
      console.log(`     ${d.idea_summary}`);
    }
    if (run.evaluation) {
      console.log(
        `evaluation:    ${run.evaluation.review_status}` +
          (run.evaluation.overall_score != null
            ? ` score=${run.evaluation.overall_score}`
            : "") +
          (run.evaluation.flags?.length
            ? ` flags=${run.evaluation.flags.join(",")}`
            : "")
      );
    }
  }
  console.log("─".repeat(72));
  console.log(`${runs.length} run(s). Newer is never auto-better.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

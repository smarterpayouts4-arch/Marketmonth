/**
 * Prove Brand Core → Idea Lab topic → six directions.
 * Usage: npx tsx scripts/e2e-idea-lab-directions.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { getBrandCoreRepository } from "../src/brain/core/brand-core-repository";
import { generateAndRecordContentDirections } from "../src/brain/use-cases/generate-content-directions";
import { runIdeaLabTopicCandidates } from "../src/brain/use-cases/run-idea-lab-topic-candidates";

async function main() {
  const core = getBrandCoreRepository().getBrandCore("zynava.com");
  console.log(
    "BrandCore",
    core.brandCore.brand_name,
    "indexed",
    core.brandCore.indexed_products?.length,
    "offers",
    core.brandCore.offers.length
  );

  const topics = await runIdeaLabTopicCandidates({
    marketingFocus: "product_education",
  });
  if (!topics.ok) {
    throw new Error(`topics failed: ${topics.code} ${topics.error}`);
  }
  const first = topics.result.candidates?.[0];
  if (!first?.title) {
    throw new Error("No topic candidate title");
  }
  console.log("Topic:", first.title);

  const dirs = await generateAndRecordContentDirections({
    domain: "zynava.com",
    mode: "manual",
    topic: first.title,
    marketingFocus: "product_education",
    requestedVariations: 6,
    directionsProvider: "deterministic-v1",
    preloaded: {
      context: core.context,
      identity: core.identity,
    },
  });

  if (!dirs.ok) {
    throw new Error(dirs.error);
  }

  const variations =
    dirs.result.status === "ready" || dirs.result.status === "partially_ready"
      ? dirs.result.variations
      : [];
  console.log(
    JSON.stringify(
      {
        status: dirs.result.status,
        directionCount: variations.length,
        titles: variations.map((v) => v.punchline).slice(0, 6),
        historyPersisted: dirs.historyPersisted,
      },
      null,
      2
    )
  );
  if (variations.length < 6) {
    process.exitCode = 2;
    throw new Error(`Expected 6 directions, got ${variations.length}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

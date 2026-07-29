/**
 * Dev-only: capture deterministic six-direction outputs for audit baselines.
 * Does not assert CI equality — audit artifact only.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { generateContentDirections } from "../src/brain/content/generate-content-directions";
import { parseFixtureCsv } from "../src/brain/content/repository/parse-fixture-csv";
import type { TopicCategoryId } from "../src/brain/content/topic-category";

const ROOT = process.cwd();
const FIXTURE_DIR = path.join(ROOT, "data/fixtures/stabilization");
const OUT_DIR = path.join(FIXTURE_DIR, "baseline-outputs");
const CSV = path.join(ROOT, "data/companies/zynava.com/approved.csv");

const SCENARIOS = [
  "normal-zynava-topic",
  "broad-topic",
  "narrow-product-topic",
  "insufficient-evidence-topic",
  "duplicate-prone-topic",
  "unsupported-claim-attempt",
] as const;

async function main() {
  const csvText = readFileSync(CSV, "utf8");
  const context = parseFixtureCsv(csvText);
  if (!context) throw new Error(`Failed to parse ${CSV}`);

  mkdirSync(OUT_DIR, { recursive: true });
  const summary: Record<string, unknown>[] = [];

  for (const id of SCENARIOS) {
    const scenario = JSON.parse(
      readFileSync(path.join(FIXTURE_DIR, `${id}.json`), "utf8")
    ) as {
      topic: string;
      mode: "manual" | "automatic";
      topicCategory?: TopicCategoryId;
      recentMasterTopics?: string[];
    };

    const result = await generateContentDirections({
      context,
      mode: scenario.mode ?? "manual",
      topic: scenario.topic,
      directionsProvider: "deterministic-v1",
      recentMasterTopics: scenario.recentMasterTopics,
      topicCategory: scenario.topicCategory,
    });

    const outPath = path.join(OUT_DIR, `${id}.json`);
    writeFileSync(outPath, JSON.stringify(result, null, 2), "utf8");
    summary.push({
      id,
      status: result.status,
      masterTitle:
        result.status === "blocked"
          ? null
          : result.masterTopic.punchline,
      variationCount: result.variations?.length ?? 0,
      angles: (result.variations ?? []).map((v) => v.angle),
      safety:
        result.status === "blocked"
          ? null
          : result.masterTopic.safety,
    });
    console.log(`wrote ${outPath} status=${result.status}`);
  }

  writeFileSync(
    path.join(OUT_DIR, "_summary.json"),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        provider: "deterministic-v1",
        fixture: "data/companies/zynava.com/approved.csv",
        scenarios: summary,
      },
      null,
      2
    ),
    "utf8"
  );
  console.log("baseline capture complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

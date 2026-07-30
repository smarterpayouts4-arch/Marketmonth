/**
 * End-to-end Content Atom inspector — grounded in the live pipeline.
 *
 * Usage:
 *   npm run inspect:content-atom
 *   npm run inspect:content-atom -- zynava.com
 *   npm run inspect:content-atom -- clearflowplumbing.example
 *   npm run inspect:content-atom -- --json
 *   npm run inspect:content-atom -- --md-only
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildContentAtom } from "../src/brain/atom/build-content-atom";
import { renderReadableDocument } from "../src/brain/atom/readable-document";
import { resolveModel } from "../src/brain/policy/model-registry";
import { getBrandCoreRepository } from "../src/brain/core/brand-core-repository";
import type { TopicCategoryId } from "../src/brain/content/topic-category";
import { TOPIC_CATEGORY_IDS } from "../src/brain/content/topic-category";
import { generateAndRecordContentDirections } from "../src/brain/use-cases/generate-content-directions";
import { generateTopicCandidates } from "../src/brain/evaluation/generate-topic-candidates";
import { selectedTopicContextFromCandidate } from "../src/components/topic-candidates/from-candidate";

type Cli = {
  domain: string;
  topicCategory: TopicCategoryId;
  topicRank: number;
  directionRank: number;
  jsonOnly: boolean;
  mdOnly: boolean;
};

function parseCli(argv: string[]): Cli {
  const args = argv.slice(2);
  let domain = "zynava.com";
  let topicCategory: TopicCategoryId = "product_education";
  let topicRank = 1;
  let directionRank = 1;
  let jsonOnly = false;
  let mdOnly = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--topic-rank") {
      topicRank = Math.max(1, Number(args[++i]) || 1);
      continue;
    }
    if (a === "--direction-rank") {
      directionRank = Math.max(1, Number(args[++i]) || 1);
      continue;
    }
    if (a === "--json") {
      jsonOnly = true;
      continue;
    }
    if (a === "--md-only") {
      mdOnly = true;
      continue;
    }
    if (a.startsWith("-")) continue;
    if (!a.includes(".") && TOPIC_CATEGORY_IDS.includes(a as TopicCategoryId)) {
      topicCategory = a as TopicCategoryId;
      continue;
    }
    if (domain === "zynava.com" || a.includes(".") || a.includes("-")) {
      domain = a;
    }
  }

  return { domain, topicCategory, topicRank, directionRank, jsonOnly, mdOnly };
}

async function main() {
  const cli = parseCli(process.argv);
  const model = resolveModel("contentAtomLlm");
  const startedAt = Date.now();

  if (!cli.jsonOnly) {
    console.log("=== Content Atom inspector ===");
    console.log(`domain=${cli.domain} category=${cli.topicCategory}`);
    console.log(`topicRank=${cli.topicRank} directionRank=${cli.directionRank}`);
    console.log(`atom model=${model}`);
    console.log("");
  }

  const loaded = getBrandCoreRepository().getBrandCore(cli.domain);
  const { brandCore, identity, context } = loaded;
  if (!cli.jsonOnly) {
    console.log(
      `[1/4] Brand Core: ${brandCore.brand_name} | proofs=${brandCore.proof_library.length}`
    );
  }

  const generation = generateTopicCandidates({
    context,
    objective: cli.topicCategory,
  });
  if (generation.status === "insufficient_context") {
    throw new Error(
      `insufficient_context: ${generation.diagnostic.message}`
    );
  }
  const candidates = generation.candidates;
  const topicIdx = Math.min(cli.topicRank, candidates.length) - 1;
  const topic = candidates[topicIdx]!;
  const selectedTopicContext = selectedTopicContextFromCandidate(
    topic,
    cli.topicCategory
  );
  if (!cli.jsonOnly) {
    console.log(
      `[2/4] Topic (#${topic.rank}/${candidates.length}): ${topic.title}`
    );
  }

  const dirs = await generateAndRecordContentDirections({
    domain: cli.domain,
    mode: "automatic",
    topic: selectedTopicContext.masterTitle,
    topicCategory: cli.topicCategory,
    requestedVariations: 6,
    directionsProvider: "deterministic-v1",
    selectedTopicContext,
    runPurpose: "benchmark",
    preloaded: { context, identity },
  });
  if (!dirs.ok) {
    throw new Error(`directions failed: ${dirs.error}`);
  }
  const variations =
    dirs.result.status === "ready" || dirs.result.status === "partially_ready"
      ? dirs.result.variations
      : [];
  if (variations.length === 0) {
    throw new Error(`No directions (status=${dirs.result.status})`);
  }
  const dirIdx = Math.min(cli.directionRank, variations.length) - 1;
  const variation = variations[dirIdx]!;
  if (!cli.jsonOnly) {
    console.log(
      `[3/4] Direction (#${dirIdx + 1}/${variations.length}): ${variation.punchline}`
    );
    console.log(`[4/4] Building Content Atom (preferLlm=true)…`);
  }

  if (dirs.result.status === "blocked") {
    throw new Error(
      `directions blocked: ${(dirs.result.warnings ?? []).join("; ") || "unavailable"}`
    );
  }

  const atomStarted = Date.now();
  const built = await buildContentAtom({
    brandCore,
    preferLlm: true,
    apiKey: process.env.OPENAI_API_KEY?.trim(),
    selected: {
      masterTopic: dirs.result.masterTopic,
      variation,
      selectedTopicContext,
      generationId: dirs.generationId ?? undefined,
      topicCategory: cli.topicCategory,
    },
  });
  const atomMs = Date.now() - atomStarted;

  if (!built.atom) {
    throw new Error(
      `atom build failed: ${(built.ok ? [] : built.errors).join("; ") || "no atom"}`
    );
  }

  const atom = built.atom;
  const report = built.report;
  const doc = renderReadableDocument({
    brand: brandCore.brand_name,
    topic: topic.title,
    atom,
    report,
    brandCore,
    admitted: built.trace?.admittedEvidence,
    rejected: built.trace?.rejectedEvidence,
  });
  const words =
    Number(doc.match(/Words:\s*(\d+)/)?.[1]) ||
    doc.split(/\s+/).filter(Boolean).length;

  if (!cli.jsonOnly && !cli.mdOnly) {
    console.log("");
    console.log(doc);
    console.log("");
    console.log(
      `ok=${built.ok} provider=${built.provider} latency=${atomMs}ms words=${words}`
    );
  } else if (cli.mdOnly) {
    console.log(doc);
  }

  const outDir = path.join(process.cwd(), "data", "runtime");
  mkdirSync(outDir, { recursive: true });

  const payload = {
    generatedAt: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
    atomLatencyMs: atomMs,
    wordCount: words,
    model,
    cli,
    brand: {
      name: brandCore.brand_name,
      domain: brandCore.domain,
      companyId: identity.company_id,
      proofCount: brandCore.proof_library.length,
    },
    topic: {
      rank: topic.rank,
      topicId: topic.topicId,
      title: topic.title,
      evidenceIds: topic.evidenceIds,
    },
    selectedDirection: {
      id: variation.id,
      punchline: variation.punchline,
      angle: variation.angle,
      evidenceIds: variation.evidenceIds,
    },
    build: {
      ok: built.ok,
      provider: built.provider,
      errors: built.ok ? [] : built.errors,
    },
    atom,
    validationReport: report ?? null,
    readableDocument: doc,
  };

  if (!cli.mdOnly) {
    const jsonPath = path.join(outDir, "inspect-content-atom-report.json");
    writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
    if (cli.jsonOnly) {
      console.log(JSON.stringify({ wordCount: words, buildStatus: atom.buildStatus, path: jsonPath }, null, 2));
    } else {
      console.log(`Wrote ${jsonPath}`);
    }
  }

  if (!cli.jsonOnly) {
    const mdPath = path.join(outDir, "inspect-content-atom-readable.md");
    writeFileSync(mdPath, `# Content Atom inspection\n\n\`\`\`\n${doc}\n\`\`\`\n`);
    if (!cli.mdOnly) console.log(`Wrote ${mdPath}`);
  }

  if (!built.ok && atom.buildStatus === "invalid") {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : err);
  process.exit(1);
});

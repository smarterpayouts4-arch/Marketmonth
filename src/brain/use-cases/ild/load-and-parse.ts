import { readFileSync } from "node:fs";

import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";
import type { ContentBrainContext } from "@/brain/content/types";
import {
  getBrandCore,
  type BrandCore,
  type BrandCoreIdentity,
} from "@/brain/core";
import {
  endTimer,
  skipRemaining,
  startTimer,
} from "@/brain/evaluation/build-idea-lab-trace";
import type { IdeaLabRun } from "@/brain/evaluation/idea-lab.types";
import {
  assertCsvRectangular,
  CsvShapeError,
  parseCsv,
} from "@/lib/dev/parse-csv";

import { finalizeFailedRun } from "./finalize-failed";
import { fixtureHash } from "./fixture";
import type { RunTimer, TraceDrafts } from "./types";

export type LoadedLabContext = {
  text: string;
  hash: string;
  context: ContentBrainContext;
  brandCore: BrandCore;
  identity: BrandCoreIdentity;
  evidenceCount: number;
};

export type LoadResult =
  | { ok: true; value: LoadedLabContext }
  | { ok: false; run: IdeaLabRun };

export async function loadAndParseIdeaLabFixture(args: {
  fixturePath: string;
  runId: string;
  runStarted: RunTimer;
  drafts: TraceDrafts;
  historyRepositoryPath: string;
  labHistoryRecordCountBefore: number;
}): Promise<LoadResult> {
  const {
    fixturePath,
    runId,
    runStarted,
    drafts,
    historyRepositoryPath,
    labHistoryRecordCountBefore,
  } = args;

  let text = "";
  try {
    const tLoad = startTimer();
    text = readFileSync(fixturePath, "utf8");
    const loadEnd = endTimer(tLoad);
    drafts.push({
      stage: "CSV loaded",
      modulePath: "data/fixtures/zynava-discovery.csv",
      symbol: "readFileSync",
      status: "success",
      ...loadEnd,
      outputSummary: { bytes: text.length, fixtureHash: fixtureHash(text) },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "CSV load failed";
    drafts.push({
      stage: "CSV loaded",
      modulePath: "data/fixtures/zynava-discovery.csv",
      status: "error",
      warnings: [msg],
    });
    drafts.push(...skipRemaining(1, msg));
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
      }),
    };
  }

  const hash = fixtureHash(text);

  try {
    const tShape = startTimer();
    const grid = parseCsv(text);
    assertCsvRectangular(grid);
    drafts.push({
      stage: "CSV shape validated",
      modulePath: "src/lib/dev/parse-csv.ts",
      symbol: "assertCsvRectangular",
      status: "success",
      ...endTimer(tShape),
      outputSummary: {
        headerCells: grid[0]?.length,
        dataRows: Math.max(0, grid.length - 1),
      },
    });
  } catch (err) {
    const msg =
      err instanceof CsvShapeError
        ? err.message
        : err instanceof Error
          ? err.message
          : "CSV shape invalid";
    drafts.push({
      stage: "CSV shape validated",
      modulePath: "src/lib/dev/parse-csv.ts",
      symbol: "assertCsvRectangular",
      status: "error",
      warnings: [msg],
    });
    drafts.push(...skipRemaining(2, msg));
    return {
      ok: false,
      run: await finalizeFailedRun({
        runId,
        runStarted,
        drafts,
        historyRepositoryPath,
        labHistoryRecordCountBefore,
        errors: [msg],
        fixtureHash: hash,
        topicMode: "manual",
      }),
    };
  }

  const tParse = startTimer();
  const context = parseFixtureCsv(text);
  if (!context) {
    const msg = "parseFixtureCsv returned null";
    drafts.push({
      stage: "Fixture parsed",
      modulePath: "src/brain/content/repository/parse-fixture-csv.ts",
      symbol: "parseFixtureCsv",
      status: "error",
      ...endTimer(tParse),
      warnings: [msg],
    });
    drafts.push(...skipRemaining(3, msg));
    return {
      ok: false,
      run: await finalizeFailedRun({
        runId,
        runStarted,
        drafts,
        historyRepositoryPath,
        labHistoryRecordCountBefore,
        errors: [msg],
        fixtureHash: hash,
        topicMode: "manual",
      }),
    };
  }
  drafts.push({
    stage: "Fixture parsed",
    modulePath: "src/brain/content/repository/parse-fixture-csv.ts",
    symbol: "parseFixtureCsv",
    status: "success",
    ...endTimer(tParse),
    outputSummary: { brandName: context.brandName, domain: context.domain },
  });

  const evidenceCount = Object.keys(context.evidenceById).length;
  drafts.push({
    stage: "Evidence normalized",
    modulePath: "src/brain/content/evidence.ts",
    symbol: "toEvidence",
    status: "success",
    durationMs: null,
    outputSummary: {
      evidenceCount,
      note: "Path B uses toEvidence per CSV row (no separate normalizer module)",
    },
  });

  drafts.push({
    stage: "ContentBrainContext created",
    modulePath: "src/brain/content/repository/parse-fixture-csv.ts",
    symbol: "ContentBrainContext",
    status: "success",
    durationMs: null,
    outputSummary: {
      products: context.products.length,
      services: context.services.length,
      contentOpportunities: context.contentOpportunities.length,
      source: context.source,
    },
  });

  const tCore = startTimer();
  const loaded = getBrandCore(context.domain, { context });
  const { brandCore, identity } = loaded;
  drafts.push({
    stage: "BrandCore compiled",
    modulePath: "src/brain/core/get-brand-core.ts",
    symbol: "getBrandCore",
    status: "success",
    ...endTimer(tCore),
    outputSummary: {
      brand_core_id: identity.brand_core_id,
      brand_core_hash: identity.brand_core_hash,
      brand_core_version: identity.brand_core_version,
      offers: brandCore.offers.length,
      proof_library: brandCore.proof_library.length,
      usedAsPrimaryIdeaInput: false,
    },
    warnings: [
      "Brand Core via getBrandCore; deterministic-v1 ideas still use ContentBrainContext templates",
    ],
  });

  return {
    ok: true,
    value: { text, hash, context, brandCore, identity, evidenceCount },
  };
}

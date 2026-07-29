import type { ContentBrainContext } from "@/brain/content/types";
import {
  getBrandCoreRepository,
  type BrandCore,
  type BrandCoreIdentity,
} from "@/brain/core";
import {
  endTimer,
  skipRemaining,
  startTimer,
} from "@/brain/evaluation/build-idea-lab-trace";
import type { IdeaLabRun } from "@/brain/evaluation/idea-lab.types";

import { finalizeFailedRun } from "./finalize-failed";
import type { RunTimer, TraceDrafts } from "./types";

export type LoadedLabContext = {
  text: string;
  hash: string;
  context: ContentBrainContext;
  brandCore: BrandCore;
  identity: BrandCoreIdentity;
  evidenceCount: number;
  fixturePath: string;
};

export type LoadResult =
  | { ok: true; value: LoadedLabContext }
  | { ok: false; run: IdeaLabRun };

export async function loadAndParseIdeaLabFixture(args: {
  companyId: string;
  fixturePath?: string;
  runId: string;
  runStarted: RunTimer;
  drafts: TraceDrafts;
  historyRepositoryPath: string;
  labHistoryRecordCountBefore: number;
}): Promise<LoadResult> {
  const {
    companyId,
    fixturePath,
    runId,
    runStarted,
    drafts,
    historyRepositoryPath,
    labHistoryRecordCountBefore,
  } = args;

  const tCore = startTimer();
  let loaded;
  try {
    loaded = getBrandCoreRepository().getBrandCore(
      companyId,
      fixturePath ? { absolutePath: fixturePath } : undefined
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Brand Core load failed";
    drafts.push({
      stage: "BrandCore compiled",
      modulePath: "src/brain/core/brand-core-repository.ts",
      symbol: "getBrandCoreRepository",
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

  const { context, brandCore, identity } = loaded;
  const hash = identity.brand_core_hash;
  const text = "";
  const evidenceCount = Object.keys(context.evidenceById).length;
  const resolvedPath = loaded.fixturePath ?? fixturePath ?? companyId;

  drafts.push({
    stage: "BrandCore compiled",
    modulePath: "src/brain/core/brand-core-repository.ts",
    symbol: "getBrandCoreRepository",
    status: "success",
    ...endTimer(tCore),
    outputSummary: {
      brand_core_id: identity.brand_core_id,
      brand_core_hash: identity.brand_core_hash,
      brand_core_version: identity.brand_core_version,
      offers: brandCore.offers.length,
      indexed_products: brandCore.indexed_products?.length ?? 0,
      proof_library: brandCore.proof_library.length,
      usedAsPrimaryIdeaInput: true,
      evidenceCount,
    },
  });

  return {
    ok: true,
    value: {
      text,
      hash,
      context,
      brandCore,
      identity,
      evidenceCount,
      fixturePath: resolvedPath,
    },
  };
}

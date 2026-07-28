import type { BrandProfile, StrategyPreview } from "../brand-profile";
import {
  findCachedAnalysis,
  persistAnalysis,
} from "./db-analysis";
import { persistStrategy } from "./db-strategy";
import { memoryPersist } from "./memory";
import type { PersistedDiscovery } from "./types";

/** Legacy helpers used by older callers */
export async function findCachedDiscovery(normalizedUrl: string) {
  return findCachedAnalysis(normalizedUrl);
}

export async function persistDiscovery(input: {
  normalizedUrl: string;
  brandProfile: BrandProfile;
  strategyPreview: StrategyPreview;
  crawlMeta: Record<string, unknown>;
}): Promise<PersistedDiscovery> {
  const analysis = await persistAnalysis({
    ...input,
    evidence: [],
  });
  const strategy = await persistStrategy({
    brandProfileId: analysis.brandProfileId,
    strategyPreview: input.strategyPreview,
  });
  return { ...analysis, ...strategy };
}

export { memoryPersist };

import { readLatestBrief } from "./memory/research-history";
import {
  isStrategyStale,
  readStrategyState,
  type SeoStrategyState,
} from "./memory/strategy-state";
import type { SeoChangeBrief } from "./contracts/recommendation";
import { fetchAnalyticsSeoSnapshot } from "./feedback/analytics-stub";
import { fetchBingWebmasterSnapshot } from "./feedback/bing-webmaster-stub";
import { fetchSearchConsoleSnapshot } from "./feedback/search-console-stub";

export type SeoIntelligenceStatus = {
  strategy: SeoStrategyState;
  stale: boolean;
  latestBrief: SeoChangeBrief | null;
  phase2Feedback: {
    searchConsole: Awaited<ReturnType<typeof fetchSearchConsoleSnapshot>>;
    bing: Awaited<ReturnType<typeof fetchBingWebmasterSnapshot>>;
    analytics: Awaited<ReturnType<typeof fetchAnalyticsSeoSnapshot>>;
  };
};

/** Login / settings should call this — never a full research run. */
export async function getSeoIntelligenceStatus(): Promise<SeoIntelligenceStatus> {
  const strategy = readStrategyState();
  return {
    strategy,
    stale: isStrategyStale(strategy),
    latestBrief: readLatestBrief(),
    phase2Feedback: {
      searchConsole: await fetchSearchConsoleSnapshot(),
      bing: await fetchBingWebmasterSnapshot(),
      analytics: await fetchAnalyticsSeoSnapshot(),
    },
  };
}

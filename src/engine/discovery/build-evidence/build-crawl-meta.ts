import { DISCOVERY_CSV_SCHEMA_VERSION } from "@/lib/company-profile/csv-contract";
import type { CrawlMeta } from "@/lib/discovery/evidence.schema";

import type { CrawlCorpus } from "../types";

export function buildCrawlMeta(
  corpus: CrawlCorpus,
  extras?: {
    detectedLocations?: CrawlMeta["detectedLocations"];
    acceptanceGate?: CrawlMeta["acceptanceGate"];
  }
): CrawlMeta {
  return {
    pageCount: corpus.pages.length,
    kinds: corpus.pages.map((p) => p.kind),
    collectionMethods: [
      ...new Set(
        corpus.pages.map((p) => p.collectionMethod ?? ("fetch" as const))
      ),
    ],
    pageSummaries: corpus.pages.map((p) => ({
      url: p.url,
      pageType: p.kind,
      title: p.title,
      collectionMethod: p.collectionMethod ?? "fetch",
    })),
    detectedLocations: extras?.detectedLocations,
    failedUrls: corpus.failedUrls?.length ? corpus.failedUrls : undefined,
    fetchAttempts: corpus.fetchAttempts,
    extraPageFailures: corpus.extraPageFailures?.length
      ? corpus.extraPageFailures
      : undefined,
    csvSchemaVersion: DISCOVERY_CSV_SCHEMA_VERSION,
    acceptanceGate: extras?.acceptanceGate,
  };
}

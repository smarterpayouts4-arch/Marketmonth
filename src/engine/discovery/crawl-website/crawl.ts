import { getCompanyDiscoveryConfig } from "../company-discovery-config";
import { getOrigin, normalizeWebsiteUrl } from "../normalize-url";
import type { CrawledPage, CrawlCorpus, PageKind } from "../types";

import { canonicalizeUrl } from "./canonicalize-url";
import { classifyPath } from "./classify-path";
import { collectPage, toCrawled } from "./collect-page";
import {
  MAX_CATALOG_PAGES,
  MAX_FETCH_ATTEMPTS,
  MAX_SUCCESSFUL_PAGES,
} from "./constants";
import {
  extractSameOriginLinks,
  isCatalogPath,
  scoreCandidate,
} from "./extract-links";

type QueueItem = {
  url: string;
  kind: PageKind;
  score: number;
  hop: number;
  /** Seeded extras bypass kind-slot exclusivity. */
  seeded?: boolean;
};

/**
 * Bounded same-origin crawl: max successful pages AND max fetch attempts.
 * Second-hop links only from successfully fetched about + products pages.
 * At most MAX_CATALOG_PAGES product/catalog pages.
 * Zynava hosts seed EXTRA_URLS into the BFS queue at high priority.
 */
export async function crawlWebsite(rawUrl: string): Promise<CrawlCorpus> {
  const normalizedUrl = normalizeWebsiteUrl(rawUrl);
  const origin = getOrigin(normalizedUrl);
  const failedUrls: string[] = [];

  const homeCollected = await collectPage(normalizedUrl, "home", {
    skipDelay: true,
  });
  if (!homeCollected?.html) {
    throw new Error(
      "Could not fetch that website. Check the URL and try again."
    );
  }

  const pages: CrawledPage[] = [toCrawled(homeCollected, "home")];
  let attempts = 1;
  let catalogCount = pages.filter((p) => isCatalogPath(new URL(p.url).pathname))
    .length;

  const seen = new Set<string>([
    canonicalizeUrl(normalizedUrl, origin) ?? normalizedUrl,
  ]);
  const queue: QueueItem[] = [];

  const enqueueFrom = (html: string, baseUrl: string, hop: number) => {
    if (hop > 1) return; // only first-hop from home; second-hop handled separately
    for (const url of extractSameOriginLinks(html, origin, baseUrl)) {
      if (seen.has(url)) continue;
      const kind = classifyPath(new URL(url).pathname);
      if (kind === "other" || kind === "home") continue;
      const score = scoreCandidate(url);
      if (score <= 0) continue;
      queue.push({ url, kind, score, hop: 1 });
    }
  };

  enqueueFrom(homeCollected.html, normalizedUrl, 0);

  // Seed per-company extras (even when path classifies as other)
  for (const url of getCompanyDiscoveryConfig(normalizedUrl).extraSeedUrls) {
    const key = canonicalizeUrl(url, origin) ?? url.replace(/\/$/, "");
    if (seen.has(key) || queue.some((q) => q.url === key || q.url === url)) {
      continue;
    }
    const kind = classifyPath(new URL(url).pathname);
    queue.push({
      url,
      kind: kind === "home" ? "other" : kind,
      score: 10_000,
      hop: 1,
      seeded: true,
    });
  }

  // Deterministic order: score desc, then URL asc
  const sortQueue = () => {
    queue.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.url.localeCompare(b.url);
    });
  };
  sortQueue();

  const seenKinds = new Set<PageKind>(["home"]);
  const secondHopSources: CrawledPage[] = [];

  while (
    queue.length > 0 &&
    pages.length < MAX_SUCCESSFUL_PAGES &&
    attempts < MAX_FETCH_ATTEMPTS
  ) {
    sortQueue();
    const next = queue.shift();
    if (!next) break;
    if (seen.has(next.url)) continue;

    // Prefer one page per kind first; allow extra catalog up to MAX_CATALOG_PAGES
    // Seeded extras always fetch (bypass kind exclusivity).
    const isCatalog =
      next.kind === "products" && isCatalogPath(new URL(next.url).pathname);
    if (
      !next.seeded &&
      seenKinds.has(next.kind) &&
      !(isCatalog && catalogCount < MAX_CATALOG_PAGES)
    ) {
      continue;
    }
    if (isCatalog && catalogCount >= MAX_CATALOG_PAGES) {
      continue;
    }

    seen.add(next.url);
    attempts += 1;
    const collected = await collectPage(next.url, next.kind);
    if (!collected) {
      failedUrls.push(next.url);
      continue;
    }

    const crawled = toCrawled(collected, next.kind);
    pages.push(crawled);
    seenKinds.add(next.kind);
    if (isCatalog || next.kind === "products") {
      catalogCount += 1;
    }
    if (next.kind === "about" || next.kind === "products") {
      secondHopSources.push(crawled);
    }
  }

  // Second-hop only from successfully classified about + products pages
  const secondHopQueue: QueueItem[] = [];
  for (const source of secondHopSources) {
    if (!source.html) continue;
    for (const url of extractSameOriginLinks(source.html, origin, source.url)) {
      if (seen.has(url)) continue;
      const kind = classifyPath(new URL(url).pathname);
      if (kind === "other" || kind === "home") continue;
      secondHopQueue.push({
        url,
        kind,
        score: scoreCandidate(url),
        hop: 2,
      });
    }
  }
  secondHopQueue.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.url.localeCompare(b.url);
  });

  for (const next of secondHopQueue) {
    if (pages.length >= MAX_SUCCESSFUL_PAGES) break;
    if (attempts >= MAX_FETCH_ATTEMPTS) break;
    if (seen.has(next.url)) continue;
    const isCatalog =
      next.kind === "products" && isCatalogPath(new URL(next.url).pathname);
    if (isCatalog && catalogCount >= MAX_CATALOG_PAGES) continue;
    if (seenKinds.has(next.kind) && !isCatalog) continue;

    seen.add(next.url);
    attempts += 1;
    const collected = await collectPage(next.url, next.kind);
    if (!collected) {
      failedUrls.push(next.url);
      continue;
    }
    pages.push(toCrawled(collected, next.kind));
    seenKinds.add(next.kind);
    if (isCatalog || next.kind === "products") catalogCount += 1;
  }

  return {
    normalizedUrl,
    origin,
    pages,
    failedUrls: [...new Set(failedUrls)],
    fetchAttempts: attempts,
  };
}

import { collectPage, toCrawled } from "./crawl-website/collect-page";
import { classifyPath } from "./crawl-website/classify-path";
import type { CrawledPage, CrawlCorpus } from "./types";

/**
 * Fetch missing extra URLs into the corpus (idempotent).
 * Uses shared collectPage (static + Playwright upgrade) and logs failures.
 * Callers resolve URLs via getCompanyDiscoveryConfig — never host-privileged.
 */
export async function ensureExtraPages(
  corpus: CrawlCorpus,
  extraUrls: readonly string[]
): Promise<CrawlCorpus> {
  if (extraUrls.length === 0) return corpus;

  const have = new Set(corpus.pages.map((p) => p.url.replace(/\/$/, "")));
  const pages: CrawledPage[] = [...corpus.pages];
  const extraPageFailures = [...(corpus.extraPageFailures ?? [])];

  for (const url of extraUrls) {
    const key = url.replace(/\/$/, "");
    if ([...have].some((h) => h === key || h.startsWith(key))) continue;
    try {
      const kind = classifyPath(new URL(url).pathname);
      const pageKind = kind === "home" ? "other" : kind;
      const collected = await collectPage(url, pageKind);
      if (!collected?.html || collected.html.length < 200) {
        const reason = !collected ? "fetch_failed" : "html_too_short";
        console.warn(`[ensureExtraPages] ${url}: ${reason}`);
        extraPageFailures.push({ url, reason });
        continue;
      }
      pages.push(toCrawled(collected, pageKind));
      have.add(key);
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown_error";
      console.warn(`[ensureExtraPages] ${url}: ${reason}`);
      extraPageFailures.push({ url, reason });
    }
  }

  return {
    ...corpus,
    pages,
    extraPageFailures:
      extraPageFailures.length > 0 ? extraPageFailures : undefined,
  };
}

import * as cheerio from "cheerio";

import { fetchRenderedPage } from "@/lib/discovery/browser/fetch-rendered-page";
import { fetchStaticPage } from "@/lib/discovery/browser/fetch-static-page";
import { shouldUsePlaywright } from "@/lib/discovery/browser/should-use-playwright";
import type { CollectedPage } from "@/lib/discovery/browser/types";

import { getOrigin, normalizeWebsiteUrl } from "./normalize-url";
import type { CrawledPage, CrawlCorpus, PageKind } from "./types";

/** Maximum successfully fetched pages (including home). */
export const MAX_SUCCESSFUL_PAGES = 10;

/**
 * Maximum fetch attempts / dequeued candidate URLs (includes failures).
 * Stop when either this or MAX_SUCCESSFUL_PAGES is hit.
 */
export const MAX_FETCH_ATTEMPTS = 24;

/** Cap distinct product/catalog pages kept in the corpus. */
export const MAX_CATALOG_PAGES = 3;

/** Marketing priority for deterministic slot selection. */
const KIND_PRIORITY: Record<Exclude<PageKind, "other">, number> = {
  home: 1000,
  products: 900,
  how_it_works: 850,
  about: 800,
  faq: 700,
  testimonials: 600,
  blog: 500,
  contact: 400,
};

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "mc_cid",
  "mc_eid",
]);

export function classifyPath(pathname: string): PageKind {
  const p = pathname.toLowerCase();
  if (p === "/" || p === "") return "home";
  if (/how-it-works|howitworks|how_we|product-tour|tour-tour/.test(p)) {
    return "how_it_works";
  }
  if (/product|shop|store|services|solutions|catalog|pricing/.test(p)) {
    return "products";
  }
  if (/about|our-story|who-we-are|company/.test(p)) return "about";
  if (/faq|help|support|questions/.test(p)) return "faq";
  if (/testimonial|review|case-stud|success-stor|customers/.test(p)) {
    return "testimonials";
  }
  if (/blog|resource|learn|education|articles|guides|news/.test(p)) {
    return "blog";
  }
  if (/contact|get-in-touch/.test(p)) return "contact";
  return "other";
}

export function canonicalizeUrl(raw: string, origin: string): string | null {
  try {
    const absolute = new URL(raw);
    if (absolute.protocol !== "http:" && absolute.protocol !== "https:") {
      return null;
    }
    if (absolute.origin !== origin) return null;
    absolute.hash = "";
    for (const key of [...absolute.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        absolute.searchParams.delete(key);
      }
    }
    // Stable query order
    absolute.searchParams.sort();
    let href = absolute.toString();
    if (href.endsWith("/") && absolute.pathname !== "/") {
      href = href.slice(0, -1);
    }
    return href;
  } catch {
    return null;
  }
}

function scoreCandidate(url: string): number {
  const kind = classifyPath(new URL(url).pathname);
  if (kind === "other" || kind === "home") return 0;
  return KIND_PRIORITY[kind];
}

function isCatalogPath(pathname: string): boolean {
  return /product|shop|store|catalog|pricing/.test(pathname.toLowerCase());
}

function extractSameOriginLinks(
  html: string,
  origin: string,
  baseUrl: string
): string[] {
  const $ = cheerio.load(html);
  const found = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (
      !href ||
      href.startsWith("#") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:")
    ) {
      return;
    }
    try {
      const absolute = new URL(href, baseUrl).toString();
      const canonical = canonicalizeUrl(absolute, origin);
      if (canonical) found.add(canonical);
    } catch {
      /* ignore bad hrefs */
    }
  });

  return [...found].sort((a, b) => a.localeCompare(b));
}

async function collectPage(
  url: string,
  pageType: PageKind
): Promise<CollectedPage | null> {
  let page: CollectedPage;
  try {
    page = await fetchStaticPage({ url, pageType });
  } catch {
    return null;
  }

  // Re-validate final URL against same-origin (redirects)
  try {
    const finalOrigin = new URL(page.url).origin;
    const expectedOrigin = new URL(url).origin;
    if (finalOrigin !== expectedOrigin) return null;
  } catch {
    return null;
  }

  if (!page.html || page.status >= 400) return null;

  if (shouldUsePlaywright(page)) {
    const rendered = await fetchRenderedPage({ url, pageType });
    if (rendered?.html && rendered.text.length > page.text.length) {
      try {
        if (new URL(rendered.url).origin !== new URL(url).origin) {
          return page;
        }
      } catch {
        return page;
      }
      return rendered;
    }
  }

  return page;
}

function toCrawled(page: CollectedPage, kind: PageKind): CrawledPage {
  return {
    url: page.url,
    status: page.status,
    html: page.html,
    title: page.title || page.url,
    kind,
    text: page.text,
    collectionMethod: page.collectionMethod,
  };
}

type QueueItem = { url: string; kind: PageKind; score: number; hop: number };

/**
 * Bounded same-origin crawl: max successful pages AND max fetch attempts.
 * Second-hop links only from successfully fetched about + products pages.
 * At most MAX_CATALOG_PAGES product/catalog pages.
 */
export async function crawlWebsite(rawUrl: string): Promise<CrawlCorpus> {
  const normalizedUrl = normalizeWebsiteUrl(rawUrl);
  const origin = getOrigin(normalizedUrl);

  const homeCollected = await collectPage(normalizedUrl, "home");
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
    const isCatalog = next.kind === "products" && isCatalogPath(new URL(next.url).pathname);
    if (seenKinds.has(next.kind) && !(isCatalog && catalogCount < MAX_CATALOG_PAGES)) {
      continue;
    }
    if (isCatalog && catalogCount >= MAX_CATALOG_PAGES) {
      continue;
    }

    seen.add(next.url);
    attempts += 1;
    const collected = await collectPage(next.url, next.kind);
    if (!collected) continue;

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
    if (!collected) continue;
    pages.push(toCrawled(collected, next.kind));
    seenKinds.add(next.kind);
    if (isCatalog || next.kind === "products") catalogCount += 1;
  }

  return { normalizedUrl, origin, pages };
}

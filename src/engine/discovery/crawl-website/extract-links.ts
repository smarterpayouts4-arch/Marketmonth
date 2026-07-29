import * as cheerio from "cheerio";

import { canonicalizeUrl } from "./canonicalize-url";
import { classifyPath } from "./classify-path";
import { KIND_PRIORITY } from "./constants";

export function scoreCandidate(url: string): number {
  const kind = classifyPath(new URL(url).pathname);
  if (kind === "other" || kind === "home") return 0;
  return KIND_PRIORITY[kind];
}

export function isCatalogPath(pathname: string): boolean {
  return /product|shop|store|catalog|pricing/.test(pathname.toLowerCase());
}

export function extractSameOriginLinks(
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

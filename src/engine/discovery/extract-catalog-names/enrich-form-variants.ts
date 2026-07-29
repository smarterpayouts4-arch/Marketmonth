import type { IndexedProduct, CrawlCorpus } from "../types";

import { loadClean } from "./mine";
import { MAX_CATALOG, scrubIndexedProducts } from "./scrub";

/**
 * When homepage discusses form tradeoffs, add shopper-facing form names
 * only if the base mineral/vitamin is already in the catalog set.
 */
export function enrichFormVariants(
  catalog: IndexedProduct[],
  corpus: CrawlCorpus
): IndexedProduct[] {
  const home =
    corpus.pages.find((p) => p.kind === "home") ?? corpus.pages[0];
  if (!home) return catalog;

  const text = loadClean(home.html)("main, article, body")
    .text()
    .replace(/\s+/g, " ");
  const byLower = new Map(
    catalog.map((p) => [p.name.toLowerCase(), p] as const)
  );
  const extras: IndexedProduct[] = [];

  const hasMagnesium = [...byLower.keys()].some((k) => k.includes("magnesium"));
  if (
    hasMagnesium &&
    /glycinate\s+vs\s+oxide|glycinate/i.test(text) &&
    !byLower.has("magnesium glycinate")
  ) {
    extras.push({
      name: "Magnesium glycinate",
      sourceUrl: home.url,
    });
  }

  const hasVitaminD = [...byLower.keys()].some(
    (k) => k === "vitamin d" || k.startsWith("vitamin d")
  );
  if (
    hasVitaminD &&
    /\bD3\s+vs\s+D2\b|\bD3\b/i.test(text) &&
    !byLower.has("vitamin d3")
  ) {
    extras.push({
      name: "Vitamin D3",
      sourceUrl: home.url,
    });
  }

  // Prefer form-enriched shopper nouns when the catalog cap binds.
  return scrubIndexedProducts([...extras, ...catalog], MAX_CATALOG);
}

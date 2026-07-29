import type { IndexedProduct, CrawlCorpus } from "../types";

import { enrichFormVariants } from "./enrich-form-variants";
import {
  mineCatalogPageProducts,
  mineExplorerIngredientChips,
} from "./mine";
import { boostPatternsForCorpus, catalogPriority } from "./priority";
import { isRejectedCatalogName } from "./reject";
import { MAX_CATALOG, scrubIndexedProducts } from "./scrub";

/**
 * Merge JSON-LD / offer catalog with page-mined nouns, reject tools, cap at MAX_CATALOG.
 * Domain keyword boosts apply only when the crawl already uses that vocabulary.
 */
export function mergeAndScrubIndexedProducts(input: {
  jsonLdProducts: IndexedProduct[];
  corpus: CrawlCorpus;
  offerNames?: string[];
  offerSourceUrl?: string;
}): IndexedProduct[] {
  const fromOffers: IndexedProduct[] = (input.offerNames ?? []).map((name) => ({
    name,
    sourceUrl: input.offerSourceUrl ?? input.corpus.origin,
  }));

  const merged = [
    ...mineCatalogPageProducts(input.corpus),
    ...mineExplorerIngredientChips(input.corpus),
    ...input.jsonLdProducts,
    ...fromOffers,
  ];

  const byKey = new Map<string, IndexedProduct>();
  for (const p of merged) {
    if (!p.name || isRejectedCatalogName(p.name)) continue;
    const key = p.name.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, p);
  }

  const corpusText = input.corpus.pages
    .map((p) => `${p.url}\n${p.title ?? ""}\n${p.html}`)
    .join("\n");
  const boostPatterns = boostPatternsForCorpus(corpusText);

  const ranked = [...byKey.values()].toSorted(
    (a, b) =>
      catalogPriority(a.name, boostPatterns) -
      catalogPriority(b.name, boostPatterns)
  );
  const scrubbed = scrubIndexedProducts(ranked, MAX_CATALOG * 2);
  return enrichFormVariants(scrubbed, input.corpus);
}

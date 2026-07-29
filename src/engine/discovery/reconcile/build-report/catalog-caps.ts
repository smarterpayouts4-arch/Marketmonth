import { mergeAndScrubIndexedProducts } from "../../extract-catalog-names";
import type { IndexedProduct } from "../../types";
import {
  corpusFromFrozenPages,
  type FrozenPage,
} from "../frozen-corpus";

/**
 * Simulate fixture-like (full) vs Analyze-like catalog caps.
 * Analyze now seeds EXTRA_URLS (ingredient-explorer + how-it-works), so the
 * Analyze-like sim includes those pages (parity with live Analyze).
 */
export function simulateCatalogCaps(pages: FrozenPage[]): {
  fullCap: IndexedProduct[];
  withoutExplorerCap: IndexedProduct[];
} {
  if (pages.length === 0) {
    return { fullCap: [], withoutExplorerCap: [] };
  }
  const fullCap = mergeAndScrubIndexedProducts({
    jsonLdProducts: [],
    corpus: corpusFromFrozenPages(pages),
  });
  // Historical contrast: pages without /tools/ paths (pre-EXTRA_URLS Analyze).
  // Kept for reconcile diagnostics; Analyze-like preferred path is fullCap.
  const withoutExplorer = pages.filter(
    (p) => !/ingredient-explorer|\/tools\//i.test(p.url)
  );
  const withoutExplorerCap = mergeAndScrubIndexedProducts({
    jsonLdProducts: [],
    corpus: corpusFromFrozenPages(withoutExplorer),
  });
  return { fullCap, withoutExplorerCap };
}

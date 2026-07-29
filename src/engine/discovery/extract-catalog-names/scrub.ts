import type { IndexedProduct } from "../types";

import { isRejectedCatalogName } from "./reject";

/** Cap includes form variants + core vitamins/minerals (Calcium + Omega-3 both fit). */
export const MAX_CATALOG = 10;

export function scrubIndexedProducts(
  products: IndexedProduct[],
  max = MAX_CATALOG
): IndexedProduct[] {
  const out: IndexedProduct[] = [];
  const seen = new Set<string>();
  for (const p of products) {
    const name = p.name?.trim();
    if (!name || isRejectedCatalogName(name)) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      price: p.price,
      sourceUrl: p.sourceUrl,
    });
    if (out.length >= max) break;
  }
  return out;
}

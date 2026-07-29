import type { IndexedProduct } from "../types";

/**
 * Educational topics = observed catalog product names only.
 * No instructional templates ("What to know about…") — those invented
 * copy was leaking into both Growth Direction labels and topic subjects.
 */
export function contentOpportunitiesForCatalog(
  catalog: IndexedProduct[]
): string[] {
  const topics: string[] = [];
  const seen = new Set<string>();

  for (const p of catalog) {
    if (topics.length >= 6) break;
    const name = p.name?.trim();
    if (!name || name.length < 2 || name.length > 80) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    topics.push(name);
  }

  return topics.slice(0, 6);
}

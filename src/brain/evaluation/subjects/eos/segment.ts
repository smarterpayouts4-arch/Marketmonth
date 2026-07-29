/**
 * Recover block boundaries from camel-glued crawl text (cheerio .text() on <main>).
 */
export function segmentBlockBoundaries(glued: string): string[] {
  return glued
    .replace(/([a-z0-9])([A-Z])/g, "$1\n$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1\n$2")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

import type { BrandSignals, CompetitorHints, CrawlCorpus } from "./types";

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "your",
  "our",
  "from",
  "this",
  "that",
  "are",
  "you",
  "all",
  "not",
  "can",
  "has",
  "have",
  "will",
  "about",
  "home",
  "page",
  "more",
  "shop",
  "buy",
  "best",
  "free",
  "learn",
  "click",
]);

function keywords(text: string, limit: number): string[] {
  const counts = new Map<string, number>();
  for (const raw of text.toLowerCase().match(/[a-z]{4,}/g) ?? []) {
    if (STOP.has(raw)) continue;
    counts.set(raw, (counts.get(raw) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

/**
 * Keyword hints for competitor suggestions — never claims verified SEO rivals.
 * Uses title, meta, headings, about, products, and FAQ language when present.
 */
export function analyzeCompetitors(
  corpus: CrawlCorpus,
  signals: BrandSignals
): CompetitorHints {
  const faqBlob = [
    signals.faqText,
    ...signals.faqs.map((f) => `${f.question} ${f.answer}`),
  ].join(" ");

  const blob = [
    signals.title,
    signals.metaDescription,
    signals.headings.join(" "),
    signals.aboutText,
    signals.productText,
    faqBlob,
    corpus.pages
      .slice(0, 3)
      .map((p) => p.title)
      .join(" "),
  ].join(" ");

  const locationHints =
    blob.match(
      /\b(?:in|near|serving)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?(?:,\s*[A-Z]{2})?)/g
    ) ?? [];

  const productSource =
    signals.productText ||
    signals.headings.join(" ") ||
    signals.metaDescription;

  return {
    categoryKeywords: keywords(blob, 10),
    locationHints: locationHints.slice(0, 3),
    productKeywords: keywords(productSource, 10),
  };
}

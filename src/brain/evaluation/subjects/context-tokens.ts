import type { ContentBrainContext } from "@/brain/content/types";

/**
 * CSV-token classifier support (P2.3).
 *
 * The company's own approved CSV is the lexicon: tokens from typed catalog
 * and commercial fields corroborate kind decisions for any industry, instead
 * of relying solely on the global supplement/retail regexes in
 * ingredient-patterns.ts.
 */

const TOKEN_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "your",
  "our",
  "their",
  "that",
  "this",
  "these",
  "those",
  "are",
  "was",
  "were",
  "have",
  "has",
  "you",
  "all",
  "any",
  "per",
  "each",
  "every",
  "more",
  "most",
  "best",
  "into",
  "over",
  "under",
  "about",
  "when",
  "what",
  "how",
  "why",
  "who",
  "where",
  "which",
  "than",
  "then",
  "them",
  "they",
  "will",
  "shop",
  "buy",
  "new",
  "free",
]);

/** Lowercased tokens with enough signal to corroborate a classification. */
export function significantTokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((t) => t.length >= 4 && !TOKEN_STOPWORDS.has(t));
}

export type ContextTokenIndex = {
  /** Tokens from typed catalog records (indexedProducts + evidence). */
  catalogTokens: Set<string>;
  /** Tokens from typed commercial terms of sale. */
  commercialTokens: Set<string>;
};

export function buildContextTokenIndex(
  context: ContentBrainContext
): ContextTokenIndex {
  const catalogTokens = new Set<string>();
  const commercialTokens = new Set<string>();

  for (const product of context.indexedProducts ?? []) {
    for (const token of significantTokens(product.name ?? "")) {
      catalogTokens.add(token);
    }
  }
  for (const ev of Object.values(context.evidenceById)) {
    if (ev.field !== "indexedProduct") continue;
    for (const token of significantTokens(ev.value)) {
      catalogTokens.add(token);
    }
  }
  for (const term of context.commercialTerms ?? []) {
    for (const token of significantTokens(term.label ?? "")) {
      commercialTokens.add(token);
    }
  }

  return { catalogTokens, commercialTokens };
}

/** True when the label shares at least one significant token with the catalog. */
export function sharesCatalogToken(
  label: string,
  index: ContextTokenIndex
): boolean {
  return significantTokens(label).some((t) => index.catalogTokens.has(t));
}

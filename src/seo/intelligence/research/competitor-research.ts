import type { ResearchReport, SeoResearchProvider } from "../contracts/search-provider";
import { PRODUCT_IDENTITY } from "../../config/product-identity";

/**
 * Lightweight competitive SEO pattern scan — advisory only.
 * Does not claim ranking wins.
 */
export async function researchCompetitorPatterns(
  provider: SeoResearchProvider
): Promise<ResearchReport> {
  return provider.research({
    topic: `Public SEO patterns for AI marketing operating systems (context: ${PRODUCT_IDENTITY.displayName})`,
    questions: [
      "What public-site SEO basics do AI marketing SaaS products typically ship (metadata, docs, llms.txt, blogs)?",
      "Which practices are commonly over-claimed or spammy and should be avoided?",
    ],
  });
}

import { AUTHORITATIVE_SEO_DOMAINS } from "../contracts/source-quality";
import type { ResearchReport } from "../contracts/search-provider";
import type { SeoResearchProvider } from "../contracts/search-provider";

export async function researchSearchEngineChanges(
  provider: SeoResearchProvider
): Promise<ResearchReport> {
  return provider.research({
    topic: "Search engine SEO guidance changes",
    preferDomains: [...AUTHORITATIVE_SEO_DOMAINS],
    questions: [
      "What has Google Search Central clarified recently about indexing, robots.txt, noindex, and sitemaps?",
      "What foundational SEO practices does Google still emphasize for traditional and generative search?",
      "Any warnings about scaled AI-generated pages or spam?",
    ],
  });
}

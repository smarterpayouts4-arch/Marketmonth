import type { ResearchReport, SeoResearchProvider } from "../contracts/search-provider";

export async function researchAiCrawlerChanges(
  provider: SeoResearchProvider
): Promise<ResearchReport> {
  return provider.research({
    topic: "AI crawler and llms.txt guidance",
    preferDomains: [
      "developers.google.com",
      "docs.perplexity.ai",
      "www.perplexity.ai",
    ],
    questions: [
      "Does Google Search use llms.txt as special markup for generative search?",
      "What is the difference between PerplexityBot and Perplexity-User for site owners?",
      "Recommended robots policies for AI search retrieval vs model training?",
    ],
  });
}

import type { ResearchReport, SeoResearchProvider } from "../contracts/search-provider";

export async function researchStructuredDataChanges(
  provider: SeoResearchProvider
): Promise<ResearchReport> {
  return provider.research({
    topic: "Structured data and schema.org for software products",
    preferDomains: ["developers.google.com", "schema.org"],
    questions: [
      "Any recent Google rich-result or structured data requirement changes relevant to Organization, WebSite, or SoftwareApplication?",
      "Common structured data errors that block eligibility?",
    ],
  });
}

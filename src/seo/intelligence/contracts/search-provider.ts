export type SearchRequest = {
  query: string;
  maxResults?: number;
  recencyDays?: number;
};

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  publishedAt?: string;
};

export type ResearchRequest = {
  topic: string;
  questions: string[];
  /** Prefer official docs / engine vendor domains when possible */
  preferDomains?: string[];
};

export type ResearchCitation = {
  title: string;
  url: string;
  excerpt?: string;
  publishedAt?: string;
};

export type ResearchReport = {
  topic: string;
  summary: string;
  citations: ResearchCitation[];
  retrievedAt: string;
  provider: string;
};

/**
 * Research adapter contract. Perplexity is the first implementation —
 * not the permanent definition of the SEO brain.
 */
export interface SeoResearchProvider {
  search(input: SearchRequest): Promise<SearchResult[]>;
  research(input: ResearchRequest): Promise<ResearchReport>;
}

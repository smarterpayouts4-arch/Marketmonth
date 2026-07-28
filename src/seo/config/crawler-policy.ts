/**
 * High-level crawler stance. foundation/robots.ts turns this into robots.txt rules.
 * Training vs retrieval differs by provider — do not invent universal "AI-approved" claims.
 */
export const CRAWLER_POLICY = {
  searchIndexing: "allow",
  aiSearchRetrieval: "allow",
  modelTraining: "review-by-provider",
  /** App HTML shells: crawl allowed so noindex can be seen; not in sitemap. */
  privateApplicationRoutes: "noindex",
  apiRoutes: "disallow",
} as const;

export type CrawlerPolicy = typeof CRAWLER_POLICY;

/** Real URL path prefixes to disallow (never use Next.js route-group names). */
export const ROBOTS_DISALLOW_PATHS = ["/api/"] as const;

/**
 * Provider-specific AI crawler hints when aiSearchRetrieval is allow.
 * modelTraining remains review-by-provider — we do not blanket-allow training bots.
 */
export const AI_SEARCH_CRAWLER_ALLOW = [
  "PerplexityBot",
  "Google-Extended",
] as const;

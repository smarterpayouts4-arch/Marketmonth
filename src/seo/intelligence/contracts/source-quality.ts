/** Domains treated as higher-trust for search-engine / crawler policy claims. */
export const AUTHORITATIVE_SEO_DOMAINS = [
  "developers.google.com",
  "search.google.com",
  "www.google.com",
  "bing.com",
  "www.bing.com",
  "schema.org",
  "www.w3.org",
  "docs.perplexity.ai",
  "www.perplexity.ai",
] as const;

export function isAuthoritativeUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return AUTHORITATIVE_SEO_DOMAINS.some(
      (d) => host === d.replace(/^www\./, "") || host.endsWith(`.${d.replace(/^www\./, "")}`)
    );
  } catch {
    return false;
  }
}

export function confidenceFromSources(
  urls: string[]
): "Confirmed" | "Probable" | "Experimental" {
  const authoritative = urls.filter(isAuthoritativeUrl);
  if (authoritative.length >= 1 && urls.length === authoritative.length) {
    return "Confirmed";
  }
  if (authoritative.length >= 1) return "Probable";
  return "Experimental";
}

/**
 * Per-company discovery crawl config.
 * Resolved by companyId — no host-privileged branches in the crawl path.
 * Unknown companies get empty extras (industry-agnostic default).
 */

export type CompanyDiscoveryConfig = {
  /** Absolute URLs seeded into the crawl beyond what the homepage links. */
  extraSeedUrls: string[];
};

/** Explicit companyId → config. Keys are normalized hosts (no www.). */
const COMPANY_DISCOVERY_CONFIG: Record<string, CompanyDiscoveryConfig> = {
  "zynava.com": {
    extraSeedUrls: [
      "https://zynava.com/tools/ingredient-explorer",
      "https://zynava.com/how-it-works",
    ],
  },
};

export function companyIdFromWebsite(website: string): string {
  try {
    const host = new URL(
      /^https?:\/\//i.test(website) ? website : `https://${website}`
    ).hostname.toLowerCase();
    return host.replace(/^www\./, "");
  } catch {
    return website
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "");
  }
}

export function getCompanyDiscoveryConfig(
  companyIdOrWebsite: string
): CompanyDiscoveryConfig {
  const id = companyIdFromWebsite(companyIdOrWebsite);
  return COMPANY_DISCOVERY_CONFIG[id] ?? { extraSeedUrls: [] };
}

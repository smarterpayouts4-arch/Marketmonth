import type { BrandProfile } from "./brand-profile";
import type { CrawlCorpus } from "./types";
import type { DiscoveryEvidence } from "@/lib/discovery/evidence.schema";

/**
 * Design stub: Discovery acceptance gate before trusting a fixture / profile.
 * Does not throw — callers decide whether to write.
 */

export type DiscoveryAcceptanceReport = {
  hasCompanyIdentity: boolean;
  hasOfferings: boolean;
  hasAudienceEvidence: boolean;
  hasProblemEvidence: boolean;
  supportedClaimsRatio: number;
  unknownCriticalFields: string[];
  contradictionCount: number;
  pageCoverage: number;
  genericLanguageScore: number;
  missingExpectedTypes: string[];
  pageKindsPresent: string[];
  accepted: boolean;
  diagnostics: string[];
};

const GENERIC_AUDIENCE =
  /\b(decision-makers|primary audience|businesses looking|customers who want)\b/i;

export function evaluateDiscoveryAcceptance(input: {
  profile: BrandProfile;
  evidence: DiscoveryEvidence[];
  corpus: CrawlCorpus;
}): DiscoveryAcceptanceReport {
  const diagnostics: string[] = [];
  const kinds = [...new Set(input.corpus.pages.map((p) => p.kind))];
  const expected = ["home", "about", "faq", "products"] as const;
  const missingExpectedTypes = expected.filter((k) => !kinds.includes(k));

  const hasCompanyIdentity = Boolean(
    input.profile.businessName?.trim() && input.profile.website?.trim()
  );
  if (!hasCompanyIdentity) diagnostics.push("Missing businessName or website");

  const catalogCount = input.profile.catalogProducts?.length ?? 0;
  const hasOfferings =
    (input.profile.products?.length ?? 0) > 0 ||
    (input.profile.services?.length ?? 0) > 0 ||
    catalogCount > 0;
  if (!hasOfferings) diagnostics.push("No products, services, or catalogProducts");

  const hasAudienceEvidence = Boolean(input.profile.audience?.trim());
  if (!hasAudienceEvidence) diagnostics.push("No audience field");

  const problemEv = input.evidence.filter(
    (e) =>
      e.field === "customerProblems" ||
      e.field === "faq" ||
      e.field === "positioning"
  );
  const hasProblemEvidence = problemEv.length > 0;
  if (!hasProblemEvidence) diagnostics.push("No FAQ/problem/positioning evidence");

  const observed = input.evidence.filter((e) => e.kind === "observed");
  const supportedClaimsRatio =
    input.evidence.length === 0
      ? 0
      : observed.length / input.evidence.length;

  const unknownCriticalFields: string[] = [];
  if (!input.profile.description?.trim()) unknownCriticalFields.push("description");
  if (catalogCount === 0 && (input.profile.products?.length ?? 0) === 0) {
    unknownCriticalFields.push("offerings");
  }

  const purposeHits = expected.filter((k) => kinds.includes(k)).length;
  const pageCoverage = purposeHits / expected.length;

  const audience = input.profile.audience ?? "";
  const genericLanguageScore = GENERIC_AUDIENCE.test(audience) ? 0.7 : 0.1;
  if (genericLanguageScore >= 0.5) {
    diagnostics.push("Audience looks like generic fallback language");
  }

  if (input.corpus.pages.length <= 1) {
    diagnostics.push("Homepage-only or single-page corpus");
  }
  if (missingExpectedTypes.length > 0) {
    diagnostics.push(`Missing page kinds: ${missingExpectedTypes.join(", ")}`);
  }

  const contradictionCount = 0; // detector not implemented yet

  const accepted =
    hasCompanyIdentity &&
    hasOfferings &&
    hasAudienceEvidence &&
    hasProblemEvidence &&
    supportedClaimsRatio >= 0.5 &&
    pageCoverage >= 0.4 &&
    genericLanguageScore < 0.6 &&
    unknownCriticalFields.length === 0 &&
    contradictionCount === 0;

  if (!accepted) {
    diagnostics.push("Acceptance gate failed — do not treat fixture as trusted");
  }

  return {
    hasCompanyIdentity,
    hasOfferings,
    hasAudienceEvidence,
    hasProblemEvidence,
    supportedClaimsRatio: Number(supportedClaimsRatio.toFixed(3)),
    unknownCriticalFields,
    contradictionCount,
    pageCoverage: Number(pageCoverage.toFixed(3)),
    genericLanguageScore,
    missingExpectedTypes,
    pageKindsPresent: kinds,
    accepted,
    diagnostics,
  };
}

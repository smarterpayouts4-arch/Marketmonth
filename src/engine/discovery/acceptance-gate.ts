import type { DiscoveryEvidence } from "@/lib/discovery/evidence.schema";

import type { BrandProfile } from "./brand-profile";
import {
  descriptionHasChrome,
  isGenericAudience,
  isGenericValueProposition,
} from "./build-profile-from-corpus/derive-narrative";
import type { CrawlCorpus } from "./types";

/**
 * Discovery acceptance gate before publish / CSV materialize.
 * Does not throw — callers decide whether to write.
 */

export type GateStatus =
  | "technically_valid"
  | "usable"
  | "high_quality"
  | "approval_ready";

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
  /** Stronger than accepted — required for Neon publish → CSV. */
  approvalReady: boolean;
  status: GateStatus;
  scores: {
    identity: number;
    catalog: number;
    narrative: number;
    faq: number;
    contamination: number;
    pageCoverage: number;
    genericLanguage: number;
  };
  failures: string[];
  warnings: string[];
  diagnostics: string[];
};

const GLUED_FAQ = /Q:\s*how we work\.|What is .*?\?What |Does .*?\?Does /i;

export function evaluateDiscoveryAcceptance(input: {
  profile: BrandProfile;
  evidence: DiscoveryEvidence[];
  corpus: CrawlCorpus;
}): DiscoveryAcceptanceReport {
  const diagnostics: string[] = [];
  const failures: string[] = [];
  const warnings: string[] = [];
  const kinds = [...new Set(input.corpus.pages.map((p) => p.kind))];
  const expected = ["home", "about", "faq", "products"] as const;
  const missingExpectedTypes = expected.filter((k) => !kinds.includes(k));

  const hasCompanyIdentity = Boolean(
    input.profile.businessName?.trim() && input.profile.website?.trim()
  );
  if (!hasCompanyIdentity) {
    diagnostics.push("Missing businessName or website");
    failures.push("identity");
  }

  const catalogCount = input.profile.indexedProducts?.length ?? 0;
  const catalogWithUrl =
    input.profile.indexedProducts?.filter((p) => p.sourceUrl?.trim()).length ??
    0;
  const hasOfferings =
    (input.profile.products?.length ?? 0) > 0 ||
    (input.profile.services?.length ?? 0) > 0 ||
    catalogCount > 0;
  if (!hasOfferings) {
    diagnostics.push("No products, services, or indexedProducts");
    failures.push("offerings");
  }

  const description = input.profile.description?.trim() ?? "";
  const audience = input.profile.audience?.trim() ?? "";
  const vp = input.profile.valueProposition?.trim() ?? "";
  const services = input.profile.services ?? [];

  const hasAudienceEvidence = Boolean(audience);
  if (!hasAudienceEvidence) {
    diagnostics.push("No audience field");
    failures.push("audience");
  }

  const faqEv = input.evidence.filter((e) => e.field === "faq");
  const problemEv = input.evidence.filter(
    (e) =>
      e.field === "customerProblems" ||
      e.field === "faq" ||
      e.field === "positioning"
  );
  const hasProblemEvidence = problemEv.length > 0;
  if (!hasProblemEvidence) {
    diagnostics.push("No FAQ/problem/positioning evidence");
    failures.push("problems");
  }

  const observed = input.evidence.filter((e) => e.kind === "observed");
  const supportedClaimsRatio =
    input.evidence.length === 0
      ? 0
      : observed.length / input.evidence.length;

  const unknownCriticalFields: string[] = [];
  if (!description) unknownCriticalFields.push("description");
  if (catalogCount === 0 && (input.profile.products?.length ?? 0) === 0) {
    unknownCriticalFields.push("offerings");
  }

  const purposeHits = expected.filter((k) => kinds.includes(k)).length;
  const pageCoverage = purposeHits / expected.length;

  let genericLanguageScore = 0.1;
  if (isGenericAudience(audience)) {
    genericLanguageScore = Math.max(genericLanguageScore, 0.85);
    diagnostics.push("Audience looks like generic fallback language");
    failures.push("generic_audience");
  }
  if (isGenericValueProposition(vp)) {
    genericLanguageScore = Math.max(genericLanguageScore, 0.8);
    diagnostics.push("Value proposition looks like generic fallback");
    failures.push("generic_vp");
  }
  if (descriptionHasChrome(description)) {
    genericLanguageScore = Math.max(genericLanguageScore, 0.9);
    diagnostics.push("Description contains nav chrome");
    failures.push("description_chrome");
  }

  for (const ev of faqEv) {
    if (GLUED_FAQ.test(ev.value) || /How It WorksContact/i.test(ev.value)) {
      diagnostics.push("FAQ evidence looks glued/contaminated");
      failures.push("faq_contaminated");
      break;
    }
  }

  if (services.length === 0 && catalogCount > 0) {
    warnings.push("services_empty_with_catalog");
    diagnostics.push("Services empty while catalog evidence exists");
  }

  if (catalogCount > 0 && catalogWithUrl < catalogCount) {
    failures.push("catalog_missing_sourceUrl");
    diagnostics.push("Some indexedProducts lack sourceUrl");
  }

  if (input.corpus.pages.length <= 1) {
    diagnostics.push("Homepage-only or single-page corpus");
    warnings.push("thin_corpus");
  }
  if (missingExpectedTypes.length > 0) {
    diagnostics.push(`Missing page kinds: ${missingExpectedTypes.join(", ")}`);
    warnings.push("missing_kinds");
  }

  const contradictionCount = 0;

  const scores = {
    identity: hasCompanyIdentity ? 1 : 0,
    catalog: Math.min(1, catalogCount / 5) * (catalogWithUrl === catalogCount ? 1 : 0.6),
    narrative:
      (description ? 0.35 : 0) +
      (audience && !isGenericAudience(audience) ? 0.35 : 0) +
      (vp && !isGenericValueProposition(vp) ? 0.2 : 0) +
      (services.length > 0 ? 0.1 : 0),
    faq: Math.min(1, faqEv.length / 3),
    contamination: descriptionHasChrome(description) || failures.includes("faq_contaminated")
      ? 0
      : 1,
    pageCoverage,
    genericLanguage: 1 - genericLanguageScore,
  };

  const structurallyOk =
    hasCompanyIdentity &&
    hasOfferings &&
    hasAudienceEvidence &&
    hasProblemEvidence &&
    supportedClaimsRatio >= 0.5 &&
    pageCoverage >= 0.4 &&
    unknownCriticalFields.length === 0 &&
    contradictionCount === 0;

  const accepted =
    structurallyOk &&
    genericLanguageScore < 0.6 &&
    !failures.includes("description_chrome") &&
    !failures.includes("generic_audience") &&
    !failures.includes("generic_vp");

  const approvalReady =
    accepted &&
    scores.narrative >= 0.55 &&
    scores.contamination >= 1 &&
    !failures.includes("faq_contaminated") &&
    !failures.includes("catalog_missing_sourceUrl") &&
    catalogCount >= 3;

  let status: GateStatus = "technically_valid";
  if (accepted) status = "usable";
  if (accepted && scores.narrative >= 0.55 && scores.faq >= 0.3) {
    status = "high_quality";
  }
  if (approvalReady) status = "approval_ready";

  if (!accepted) {
    diagnostics.push("Acceptance gate failed — do not treat fixture as trusted");
  }
  if (!approvalReady) {
    diagnostics.push("Not approval_ready — do not publish/materialize CSV");
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
    approvalReady,
    status,
    scores,
    failures: [...new Set(failures)],
    warnings: [...new Set(warnings)],
    diagnostics,
  };
}

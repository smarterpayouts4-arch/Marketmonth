import type { BrandProfile } from "../brand-profile";
import type { DiscoveryEvidence } from "@/lib/discovery/evidence.schema";

import type { CompanyKnowledge, IndexedProduct } from "./types";

function faqsFromEvidence(evidence: DiscoveryEvidence[]): CompanyKnowledge["faqs"] {
  const out: CompanyKnowledge["faqs"] = [];
  for (const e of evidence) {
    if (e.field !== "faq" && e.field !== "faqs") continue;
    const value = e.value.trim();
    if (!value) continue;
    const sep = value.includes("\n")
      ? "\n"
      : value.includes(" — ")
        ? " — "
        : value.includes(": ")
          ? ": "
          : null;
    if (!sep) {
      out.push({ question: value, answer: "", sourceUrl: e.sourceUrl });
      continue;
    }
    const idx = value.indexOf(sep);
    out.push({
      question: value.slice(0, idx).trim(),
      answer: value.slice(idx + sep.length).trim(),
      sourceUrl: e.sourceUrl,
    });
  }
  return out;
}

function problemsFromEvidence(evidence: DiscoveryEvidence[]): string[] {
  return evidence
    .filter(
      (e) =>
        e.field === "customerProblems" ||
        e.field === "problemsSolved" ||
        e.field === "problem"
    )
    .map((e) => e.value.trim())
    .filter(Boolean);
}

function differentiatorsFromEvidence(evidence: DiscoveryEvidence[]): string[] {
  return evidence
    .filter(
      (e) => e.field === "differentiators" || e.field === "differentiator"
    )
    .map((e) => e.value.trim())
    .filter(Boolean);
}

/** Map BrandProfile indexedProducts → indexedProducts (not inventory). */
export function brandProfileToCompanyKnowledge(
  profile: BrandProfile,
  evidence: DiscoveryEvidence[] = []
): CompanyKnowledge {
  const indexedProducts: IndexedProduct[] = (profile.indexedProducts ?? []).map(
    (p) => ({
      name: p.name,
      sourceUrl: p.sourceUrl,
      price: p.price,
      relationship: "indexed" as const,
    })
  );

  return {
    businessName: profile.businessName,
    website: profile.website,
    description: profile.description,
    audience: profile.audience,
    platformCapabilities: [...profile.products],
    services: [...profile.services],
    indexedProducts,
    valueProposition: profile.valueProposition,
    brandVoice: profile.brandVoice,
    marketingOpportunity: profile.marketingOpportunity,
    colors: [...profile.colors],
    socialProfiles: profile.socialProfiles,
    seoSummary: profile.seoSummary,
    competitors: profile.competitors,
    faqs: faqsFromEvidence(evidence),
    differentiators: differentiatorsFromEvidence(evidence),
    problemsSolved: problemsFromEvidence(evidence),
  };
}

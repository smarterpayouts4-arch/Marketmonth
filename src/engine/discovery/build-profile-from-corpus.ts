/**
 * Thin orchestrator: shared Discovery profile build from a crawl corpus.
 * Specialists live in ./build-profile-from-corpus/*
 */
import { analyzeCompetitors } from "./analyze-competitors";
import { analyzeSeo } from "./analyze-seo";
import {
  assembleBrandProfile,
  assembleDerived,
  assembleObserved,
  toCuratedCapabilities,
} from "./build-profile-from-corpus/assemble";
import { deriveNarrative } from "./build-profile-from-corpus/derive-narrative";
import {
  DISCOVERY_PROFILE_BUILD_VERSION,
  type BuildDiscoveryProfileInput,
  type DiscoveryProfileBuild,
} from "./build-profile-from-corpus/types";
import { buildCrawlMeta, buildDiscoveryEvidence } from "./build-evidence";
import { buildBrandProfile } from "./build-strategy";
import { fallbackProfile } from "./build-strategy/fb-profile";
import { contentOpportunitiesForCatalog } from "./extract-catalog-names";
import { extractBrandSignals } from "./extract-brand";
import { findSocialLinks } from "./find-social-links";

export type {
  BuildDiscoveryProfileInput,
  CuratedCapability,
  DerivedCompanyKnowledge,
  DiscoveryDiagnostics,
  DiscoveryProfileBuild,
  ObservedCompanyKnowledge,
  PageSnapshotMetadata,
} from "./build-profile-from-corpus/types";
export { DISCOVERY_PROFILE_BUILD_VERSION } from "./build-profile-from-corpus/types";

/**
 * Single shared extraction path for Analyze + fixture propose.
 * Observed fields always come from signals/evidence — never LLM invention for catalog.
 */
export async function buildDiscoveryProfileFromCorpus(
  input: BuildDiscoveryProfileInput
): Promise<DiscoveryProfileBuild> {
  const notes: string[] = [];
  const signals = extractBrandSignals(input.corpus);
  const seo = input.seo ?? analyzeSeo(input.corpus);
  const social = input.social ?? findSocialLinks(input.corpus);
  const competitorHints =
    input.competitorHints ?? analyzeCompetitors(input.corpus, signals);

  const useRules =
    input.derivedSource === "rules" || !process.env.OPENAI_API_KEY;
  let modelName: string | null = null;

  let rawProfile = useRules
    ? fallbackProfile({
        website: input.website,
        signals,
        seo,
        social,
        competitorHints,
      })
    : await buildBrandProfile({
        website: input.website,
        signals,
        seo,
        social,
        competitorHints,
      });

  if (useRules) {
    notes.push(
      "Derived fields from evidence-grounded rules (derivedSource=rules / no API key)."
    );
  } else {
    modelName = process.env.OPENAI_DISCOVERY_MODEL || "gpt-5.4-nano";
    notes.push(`Derived fields from LLM brand profile (${modelName}).`);
    // Overlay grounded narrative when LLM left generics / chrome
    const grounded = deriveNarrative({
      businessName: rawProfile.businessName,
      signals,
    });
    for (const n of grounded.notes) notes.push(`grounded:${n}`);
    rawProfile = {
      ...rawProfile,
      description: grounded.description || rawProfile.description,
      audience: grounded.audience || rawProfile.audience,
      valueProposition:
        grounded.valueProposition || rawProfile.valueProposition,
      services:
        grounded.services.length > 0
          ? grounded.services
          : rawProfile.services,
      brandVoice: grounded.brandVoice || rawProfile.brandVoice,
      marketingOpportunity:
        grounded.marketingOpportunity || rawProfile.marketingOpportunity,
    };
  }

  // Force observed catalog onto whatever LLM returned
  rawProfile = {
    ...rawProfile,
    indexedProducts: signals.indexedProducts.map((p) => ({
      name: p.name,
      price: p.price,
      sourceUrl: p.sourceUrl,
    })),
    website: input.website,
  };

  const contentOps = contentOpportunitiesForCatalog(signals.indexedProducts);
  if (contentOps.length) {
    rawProfile = {
      ...rawProfile,
      seoSummary: {
        ...rawProfile.seoSummary,
        contentOpportunities: contentOps,
      },
    };
  }

  const observed = assembleObserved({
    website: input.website,
    signals,
    social,
  });
  const derived = assembleDerived(rawProfile);
  const curatedCapabilities = toCuratedCapabilities(input.curatedCapabilities);

  if (curatedCapabilities.length) {
    notes.push(
      `Curated platform capabilities applied (${curatedCapabilities.length}); not catalog SKUs.`
    );
  }

  const profile = assembleBrandProfile({
    observed,
    derived,
    curatedCapabilities,
    colors: signals.colors,
    socialAll: social,
  });

  const evidence = buildDiscoveryEvidence({
    corpus: input.corpus,
    signals: { ...signals, indexedProducts: observed.indexedProducts },
    social: profile.socialProfiles,
  });

  const crawlMeta = buildCrawlMeta(input.corpus);

  return {
    profile,
    observed,
    derived,
    curatedCapabilities,
    evidence,
    pages: input.corpus.pages.map((p) => ({
      url: p.url,
      kind: p.kind,
      title: p.title,
    })),
    diagnostics: {
      notes,
      modelName,
      extractorVersion: DISCOVERY_PROFILE_BUILD_VERSION,
    },
    crawlMeta,
  };
}

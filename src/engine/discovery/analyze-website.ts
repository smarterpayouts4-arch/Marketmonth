import { evaluateDiscoveryAcceptance } from "./acceptance-gate";
import { analyzeCompetitors } from "./analyze-competitors";
import { analyzeSeo } from "./analyze-seo";
import { buildDiscoveryProfileFromCorpus } from "./build-profile-from-corpus";
import {
  brandProfileToCompanyKnowledge,
  computeKnowledgeHash,
} from "./company-knowledge";
import { getCompanyDiscoveryConfig } from "./company-discovery-config";
import { ensureExtraPages } from "./crawl-extras";
import { crawlWebsite } from "./crawl-website";
import { buildDiscoveryNarrative } from "./discovery-narrative";
import { extractBrandSignals } from "./extract-brand";
import { collectOfferHints } from "./extract-offers";
import { extractLocations } from "./extract-locations";
import { findSocialLinks } from "./find-social-links";
import { materializeCompanyProfile } from "@/lib/company-profile/materialize";
import { tryReadCompanyProfile } from "@/lib/company-profile/read-company-profile";
import { makeEvidence } from "@/lib/discovery/evidence";
import { formatDetectedLocation } from "@/lib/discovery/location.schema";
import { recordProvenance } from "@/lib/provenance";
import { normalizeWebsiteUrl } from "./normalize-url";
import { persistCrawlPageSnapshots } from "./persist-page-snapshots";
import {
  findCachedAnalysis,
  memoryPersistAnalysis,
  persistAnalysis,
  type PersistedAnalysis,
} from "./persist";
import {
  DISCOVERY_STAGES,
  type DiscoveryStageId,
  type StageStatus,
} from "./stages";
import type { AnalyzeWebsiteInput } from "./types";

/** Minimum time each stage stays active so the UI can read as real progress. */
const STAGE_MIN_MS = 850;

function companyIdFromUrl(normalizedUrl: string): string {
  return new URL(normalizedUrl).hostname.replace(/^www\./, "");
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function emit(
  onStage: AnalyzeWebsiteInput["onStage"],
  id: DiscoveryStageId,
  status: StageStatus
) {
  await onStage?.(id, status);
}

async function runStage<T>(
  onStage: AnalyzeWebsiteInput["onStage"],
  id: DiscoveryStageId,
  work: () => Promise<T> | T,
  minMs = STAGE_MIN_MS
): Promise<T> {
  await emit(onStage, id, "active");
  const started = Date.now();
  const result = await work();
  const remaining = minMs - (Date.now() - started);
  if (remaining > 0) await sleep(remaining);
  await emit(onStage, id, "complete");
  return result;
}

async function replayCachedStages(onStage: AnalyzeWebsiteInput["onStage"]) {
  for (const stage of DISCOVERY_STAGES) {
    await emit(onStage, stage.id, "active");
    await sleep(STAGE_MIN_MS);
    await emit(onStage, stage.id, "complete");
  }
}

/** Prefer approved.csv, then draft.csv, when rebuilding narrative on cache hit. */
function narrativeFromArtifact(
  companyId: string,
  analysis: PersistedAnalysis
): PersistedAnalysis {
  if (analysis.discoveryNarrative) return analysis;
  const approved = tryReadCompanyProfile(companyId, {
    state: "approved",
    branch: "branch-a",
    step: "analyze:cache-hit",
  });
  if (approved) {
    return {
      ...analysis,
      discoveryNarrative: buildDiscoveryNarrative({ projection: approved }),
      artifactHash: approved.artifactHash,
    };
  }
  const draft = tryReadCompanyProfile(companyId, {
    state: "draft",
    branch: "branch-a",
    step: "analyze:cache-hit",
  });
  if (!draft) return analysis;
  return {
    ...analysis,
    discoveryNarrative: buildDiscoveryNarrative({ projection: draft }),
    artifactHash: draft.artifactHash,
  };
}

export async function analyzeWebsite(
  input: AnalyzeWebsiteInput
): Promise<PersistedAnalysis> {
  const normalizedUrl = normalizeWebsiteUrl(input.url);

  const cached =
    !input.forceRefresh && process.env.DATABASE_URL
      ? await findCachedAnalysis(normalizedUrl)
      : null;

  if (cached) {
    await replayCachedStages(input.onStage);
    const companyId = companyIdFromUrl(normalizedUrl);
    recordProvenance({
      branch: "write",
      step: "analyze:cache-hit",
      companyId,
      source: "neon",
      detail: { analysisId: cached.analysisId },
    });
    return {
      ...narrativeFromArtifact(companyId, cached),
      companyId,
    };
  }

  let corpus = await runStage(input.onStage, "crawling", () =>
    crawlWebsite(normalizedUrl)
  );

  const extraSeedUrls =
    getCompanyDiscoveryConfig(normalizedUrl).extraSeedUrls;
  if (extraSeedUrls.length > 0) {
    corpus = await ensureExtraPages(corpus, extraSeedUrls);
  }

  // Layer-1 snapshots for Analyze ↔ refresh parity (debug / reconcile)
  try {
    persistCrawlPageSnapshots({
      companyId: companyIdFromUrl(normalizedUrl),
      corpus,
      retrievedAt: new Date().toISOString(),
    });
  } catch {
    // Snapshots are best-effort; never block Analyze draft persist
  }

  const signals = await runStage(
    input.onStage,
    "understanding_audience",
    () => extractBrandSignals(corpus)
  );

  const offerHints = await runStage(input.onStage, "finding_offers", () =>
    collectOfferHints(signals).map((o) => o.label)
  );

  const [seo, social, competitorHints] = await runStage(
    input.onStage,
    "reviewing_social",
    () =>
      Promise.all([
        Promise.resolve().then(() => analyzeSeo(corpus)),
        Promise.resolve().then(() => findSocialLinks(corpus)),
        Promise.resolve().then(() => analyzeCompetitors(corpus, signals)),
      ])
  );

  const build = await runStage(
    input.onStage,
    "building_profile",
    () =>
      buildDiscoveryProfileFromCorpus({
        corpus,
        website: normalizedUrl,
        seo,
        social,
        competitorHints,
      }),
    1200
  );

  const brandProfile = build.profile;
  const mergedOffers = collectOfferHints(signals, brandProfile);
  const offerByLabel = new Map<string, (typeof mergedOffers)[number]>();
  for (const o of mergedOffers) {
    const key = o.label.toLowerCase();
    if (!offerByLabel.has(key)) offerByLabel.set(key, o);
  }
  for (const label of offerHints) {
    const key = label.toLowerCase();
    if (!offerByLabel.has(key)) offerByLabel.set(key, { label });
  }
  const offerSet = [...offerByLabel.values()].slice(0, 8);

  const detectedLocations = extractLocations(corpus);
  const evidence = [...build.evidence];
  for (const loc of detectedLocations.filter((l) => l.confidence === "high")) {
    const value = formatDetectedLocation(loc);
    if (!value) continue;
    evidence.push(
      makeEvidence({
        field: "serviceArea",
        kind: "observed",
        value,
        sourceUrl: loc.sourceUrl,
        sourcePageType: "location",
        confidence: "high",
      })
    );
  }

  // Gate diagnostics on draft (does not block persist — publish requires approval_ready)
  const gate = evaluateDiscoveryAcceptance({
    profile: brandProfile,
    evidence,
    corpus,
  });

  const crawlMeta = {
    ...build.crawlMeta,
    detectedLocations,
    failedUrls: corpus.failedUrls,
    fetchAttempts: corpus.fetchAttempts,
    extraPageFailures: corpus.extraPageFailures,
    acceptanceGate: {
      status: gate.status,
      accepted: gate.accepted,
      approvalReady: gate.approvalReady,
      failures: gate.failures,
    },
  };

  // Draft artifact is the single hand-off point to both consumer branches.
  const companyId = companyIdFromUrl(normalizedUrl);
  const artifact = materializeCompanyProfile({
    companyId,
    state: "draft",
    profile: brandProfile,
    evidence,
    crawlMeta,
    signals,
    faqs: signals.faqs,
    offers: offerSet,
    sourceUrl: normalizedUrl,
    notes: "Draft materialized by analyzeWebsite",
  });

  // Prefer approved artifact when present; else the draft just materialized.
  const approvedProjection = tryReadCompanyProfile(companyId, {
    state: "approved",
    branch: "branch-a",
    step: "analyze:materialize",
  });
  const draftProjection = tryReadCompanyProfile(companyId, {
    state: "draft",
    branch: "branch-a",
    step: "analyze:materialize",
  });
  const discoveryNarrative = approvedProjection
    ? buildDiscoveryNarrative({ projection: approvedProjection })
    : draftProjection
      ? buildDiscoveryNarrative({ projection: draftProjection })
      : buildDiscoveryNarrative({
          brandProfile,
          signals,
          faqs: signals.faqs,
          offerHints: offerSet,
        });

  if (!process.env.DATABASE_URL) {
    return {
      ...memoryPersistAnalysis({
        brandProfile,
        evidence,
        pageCount: crawlMeta.pageCount,
        detectedLocations,
        discoveryNarrative,
      }),
      discoveryNarrative,
      companyId,
      artifactHash: artifact.artifactHash,
    };
  }

  const draftKnowledge = brandProfileToCompanyKnowledge(brandProfile, evidence);
  const knowledgeHash = computeKnowledgeHash({
    knowledge: draftKnowledge,
    evidence,
  });

  try {
    const persisted = await persistAnalysis({
      normalizedUrl,
      brandProfile,
      crawlMeta,
      evidence,
      knowledgeHash,
    });
    return {
      ...persisted,
      discoveryNarrative,
      companyId,
      artifactHash: artifact.artifactHash,
    };
  } catch {
    return {
      ...memoryPersistAnalysis({
        brandProfile,
        evidence,
        pageCount: crawlMeta.pageCount,
        detectedLocations,
        discoveryNarrative,
      }),
      discoveryNarrative,
      companyId,
      artifactHash: artifact.artifactHash,
    };
  }
}

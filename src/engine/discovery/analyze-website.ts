import { analyzeCompetitors } from "./analyze-competitors";
import { analyzeSeo } from "./analyze-seo";
import { buildDiscoveryActivationProfile } from "./build-activation-profile";
import {
  buildCrawlMeta,
  buildDiscoveryEvidence,
} from "./build-evidence";
import { buildBrandProfile } from "./build-strategy";
import { crawlWebsite } from "./crawl-website";
import { extractBrandSignals } from "./extract-brand";
import { collectOfferHints } from "./extract-offers";
import { extractLocations } from "./extract-locations";
import { findSocialLinks } from "./find-social-links";
import { makeEvidence } from "@/lib/discovery/evidence";
import { formatDetectedLocation } from "@/lib/discovery/location.schema";
import { normalizeWebsiteUrl } from "./normalize-url";
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

function withActivation(analysis: PersistedAnalysis): PersistedAnalysis {
  if (analysis.activationProfile) return analysis;
  return {
    ...analysis,
    activationProfile: buildDiscoveryActivationProfile({
      brandProfile: analysis.brandProfile,
      offerHints: [
        ...analysis.brandProfile.services,
        ...analysis.brandProfile.products,
      ],
    }),
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
    return withActivation(cached);
  }

  const corpus = await runStage(input.onStage, "crawling", () =>
    crawlWebsite(normalizedUrl)
  );

  const signals = await runStage(
    input.onStage,
    "understanding_audience",
    () => extractBrandSignals(corpus)
  );

  const offerHints = await runStage(input.onStage, "finding_offers", () =>
    collectOfferHints(signals)
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

  const brandProfile = await runStage(
    input.onStage,
    "building_profile",
    () =>
      buildBrandProfile({
        website: normalizedUrl,
        signals,
        seo,
        social,
        competitorHints,
      }),
    1200
  );

  // Re-collect with profile products/services for stronger lead offers
  const mergedOffers = collectOfferHints(signals, brandProfile);
  const offerSet = [...new Set([...offerHints, ...mergedOffers])].slice(0, 8);

  const activationProfile = buildDiscoveryActivationProfile({
    brandProfile,
    signals,
    faqs: signals.faqs,
    offerHints: offerSet,
  });

  const detectedLocations = extractLocations(corpus);
  const evidence = buildDiscoveryEvidence({ corpus, signals, social });
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
  const crawlMeta = buildCrawlMeta(corpus, { detectedLocations });

  if (!process.env.DATABASE_URL) {
    return memoryPersistAnalysis({
      brandProfile,
      evidence,
      pageCount: crawlMeta.pageCount,
      detectedLocations,
      activationProfile,
    });
  }

  try {
    const persisted = await persistAnalysis({
      normalizedUrl,
      brandProfile,
      crawlMeta,
      evidence,
    });
    return { ...persisted, activationProfile };
  } catch {
    return memoryPersistAnalysis({
      brandProfile,
      evidence,
      pageCount: crawlMeta.pageCount,
      detectedLocations,
      activationProfile,
    });
  }
}

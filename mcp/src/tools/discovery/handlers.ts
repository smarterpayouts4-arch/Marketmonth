import { analyzeCompetitors } from "../../../../src/engine/discovery/analyze-competitors";
import { analyzeSeo } from "../../../../src/engine/discovery/analyze-seo";
import { analyzeWebsite } from "../../../../src/engine/discovery/analyze-website";
import { crawlWebsite } from "../../../../src/engine/discovery/crawl-website";
import { extractBrandSignals } from "../../../../src/engine/discovery/extract-brand";
import { findSocialLinks } from "../../../../src/engine/discovery/find-social-links";
import { generateStrategyForIntent } from "../../../../src/engine/discovery/generate-strategy";
import type { ToolEnvelope } from "../../contracts/envelope.js";
import { runDiscoveryUrlTool, runDraftStrategy } from "./wrap.js";

function summarizeCorpus(corpus: Awaited<ReturnType<typeof crawlWebsite>>) {
  return {
    normalizedUrl: corpus.normalizedUrl,
    origin: corpus.origin,
    pageCount: corpus.pages.length,
    pages: corpus.pages.map((p) => ({
      url: p.url,
      status: p.status,
      title: p.title,
      kind: p.kind,
      htmlBytes: p.html?.length ?? 0,
    })),
  };
}

export function mmCrawlWebsite(url: string): Promise<ToolEnvelope<unknown>> {
  return runDiscoveryUrlTool("mm_crawl_website", url, async (href) => {
    const corpus = await crawlWebsite(href);
    return summarizeCorpus(corpus);
  });
}

export function mmExtractBrand(url: string): Promise<ToolEnvelope<unknown>> {
  return runDiscoveryUrlTool("mm_extract_brand", url, async (href) => {
    const corpus = await crawlWebsite(href);
    return extractBrandSignals(corpus);
  });
}

export function mmAnalyzeSeo(url: string): Promise<ToolEnvelope<unknown>> {
  return runDiscoveryUrlTool("mm_analyze_seo", url, async (href) => {
    const corpus = await crawlWebsite(href);
    return analyzeSeo(corpus);
  });
}

export function mmDiscoverSocial(url: string): Promise<ToolEnvelope<unknown>> {
  return runDiscoveryUrlTool("mm_discover_social", url, async (href) => {
    const corpus = await crawlWebsite(href);
    return findSocialLinks(corpus);
  });
}

export function mmSuggestCompetitors(url: string): Promise<ToolEnvelope<unknown>> {
  return runDiscoveryUrlTool("mm_suggest_competitors", url, async (href) => {
    const corpus = await crawlWebsite(href);
    const signals = extractBrandSignals(corpus);
    return analyzeCompetitors(corpus, signals);
  });
}

export async function mmDraftStrategy(input: {
  brandProfile: unknown;
  goal: "awareness" | "leads" | "sales" | "loyalty";
  promoteFirst: string;
  reach: "local" | "national" | "online_broad";
  brandProfileId?: string;
}): Promise<ToolEnvelope<unknown>> {
  const envelope = await runDraftStrategy(input, async (payload) => {
    const p = payload as typeof input;
    return generateStrategyForIntent({
      brandProfile: p.brandProfile,
      brandProfileId: p.brandProfileId,
      goal: p.goal,
      promoteFirst: p.promoteFirst,
      reach: p.reach,
    });
  });
  return {
    ...envelope,
    artifactType: "strategy_draft",
    requiresHumanReview: true,
  };
}

export function mmAnalyzeWebsite(url: string): Promise<ToolEnvelope<unknown>> {
  return runDiscoveryUrlTool("mm_analyze_website", url, async (href) => {
    const result = await analyzeWebsite({ url: href });
    return {
      analysisId: result.analysisId,
      brandProfileId: result.brandProfileId,
      cached: result.cached,
      brandProfile: result.brandProfile,
    };
  });
}

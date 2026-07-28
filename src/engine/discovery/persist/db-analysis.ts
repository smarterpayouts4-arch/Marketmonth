import { desc, eq } from "drizzle-orm";

import type { CrawlMeta, DiscoveryEvidence } from "@/lib/discovery/evidence.schema";
import type { DetectedLocation } from "@/lib/discovery/location.schema";

import { getDb } from "../../../db";
import {
  brandProfiles,
  brands,
  websiteAnalyses,
} from "../../../db/schema";
import type { BrandProfile } from "../brand-profile";
import { ensureMarketingOpportunity } from "./ensure";
import type { PersistedAnalysis } from "./types";

function pageCountFromMeta(meta: unknown): number | undefined {
  if (
    meta &&
    typeof meta === "object" &&
    "pageCount" in meta &&
    typeof (meta as { pageCount: unknown }).pageCount === "number"
  ) {
    return (meta as { pageCount: number }).pageCount;
  }
  return undefined;
}

function locationsFromMeta(meta: unknown): DetectedLocation[] {
  if (
    meta &&
    typeof meta === "object" &&
    "detectedLocations" in meta &&
    Array.isArray((meta as { detectedLocations: unknown }).detectedLocations)
  ) {
    return (meta as { detectedLocations: DetectedLocation[] }).detectedLocations;
  }
  return [];
}

export async function findCachedAnalysis(
  normalizedUrl: string
): Promise<PersistedAnalysis | null> {
  try {
    const db = getDb();
    const [analysis] = await db
      .select()
      .from(websiteAnalyses)
      .where(eq(websiteAnalyses.normalizedUrl, normalizedUrl))
      .limit(1);

    if (!analysis) return null;

    const [profileRow] = await db
      .select()
      .from(brandProfiles)
      .where(eq(brandProfiles.analysisId, analysis.id))
      .orderBy(desc(brandProfiles.createdAt))
      .limit(1);

    if (!profileRow) return null;

    return {
      analysisId: analysis.id,
      brandProfileId: profileRow.id,
      brandProfile: ensureMarketingOpportunity(profileRow.profile),
      evidence: (profileRow.evidence as DiscoveryEvidence[] | null) ?? [],
      pageCount: pageCountFromMeta(analysis.crawlMeta),
      detectedLocations: locationsFromMeta(analysis.crawlMeta),
      cached: true,
    };
  } catch {
    return null;
  }
}

export async function getBrandProfileById(
  brandProfileId: string
): Promise<{
  id: string;
  profile: BrandProfile;
  evidence: DiscoveryEvidence[];
  pageCount: number;
  analysisId: string;
} | null> {
  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(brandProfiles)
      .where(eq(brandProfiles.id, brandProfileId))
      .limit(1);
    if (!row) return null;

    const [analysis] = await db
      .select()
      .from(websiteAnalyses)
      .where(eq(websiteAnalyses.id, row.analysisId))
      .limit(1);

    return {
      id: row.id,
      profile: ensureMarketingOpportunity(row.profile),
      evidence: (row.evidence as DiscoveryEvidence[] | null) ?? [],
      pageCount: pageCountFromMeta(analysis?.crawlMeta) ?? 0,
      analysisId: row.analysisId,
    };
  } catch {
    return null;
  }
}

export async function persistAnalysis(input: {
  normalizedUrl: string;
  brandProfile: BrandProfile;
  crawlMeta: CrawlMeta | Record<string, unknown>;
  evidence: DiscoveryEvidence[];
}): Promise<PersistedAnalysis> {
  const db = getDb();

  const [brand] = await db
    .insert(brands)
    .values({
      name: input.brandProfile.businessName,
      website: input.normalizedUrl,
    })
    .returning();

  const existing = await db
    .select()
    .from(websiteAnalyses)
    .where(eq(websiteAnalyses.normalizedUrl, input.normalizedUrl))
    .limit(1);

  let analysisId: string;
  if (existing[0]) {
    analysisId = existing[0].id;
    await db
      .update(websiteAnalyses)
      .set({
        brandId: brand.id,
        crawlMeta: input.crawlMeta,
      })
      .where(eq(websiteAnalyses.id, analysisId));
  } else {
    const [analysis] = await db
      .insert(websiteAnalyses)
      .values({
        brandId: brand.id,
        normalizedUrl: input.normalizedUrl,
        crawlMeta: input.crawlMeta,
      })
      .returning();
    analysisId = analysis.id;
  }

  const [profileRow] = await db
    .insert(brandProfiles)
    .values({
      analysisId,
      brandId: brand.id,
      profile: input.brandProfile,
      evidence: input.evidence,
    })
    .returning();

  return {
    analysisId,
    brandProfileId: profileRow.id,
    brandProfile: input.brandProfile,
    evidence: input.evidence,
    pageCount: pageCountFromMeta(input.crawlMeta),
    detectedLocations: locationsFromMeta(input.crawlMeta),
    cached: false,
  };
}

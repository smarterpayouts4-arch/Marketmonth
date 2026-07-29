import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import type { CrawlMeta, DiscoveryEvidence } from "@/lib/discovery/evidence.schema";
import type { DetectedLocation } from "@/lib/discovery/location.schema";

import { getDb } from "../../../db";
import {
  brandProfiles,
  brands,
  websiteAnalyses,
} from "../../../db/schema";
import type { BrandProfile } from "../brand-profile";
import { websiteUrlSlashAlternates } from "../normalize-url";
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

/** Upsert brand by website (prefer existing row; avoid orphan inserts). */
async function upsertBrandByWebsite(input: {
  name: string;
  website: string;
}): Promise<{ id: string }> {
  const db = getDb();
  const keys = websiteUrlSlashAlternates(input.website);
  const existing = await db
    .select()
    .from(brands)
    .where(inArray(brands.website, keys))
    .orderBy(desc(brands.updatedAt))
    .limit(1);

  if (existing[0]) {
    await db
      .update(brands)
      .set({
        name: input.name,
        // Heal legacy slash variants onto the canonical key.
        website: input.website,
        updatedAt: new Date(),
      })
      .where(eq(brands.id, existing[0].id));
    return { id: existing[0].id };
  }

  // Prefer orphan brand with same website and no user (legacy inserts)
  const orphan = await db
    .select()
    .from(brands)
    .where(and(inArray(brands.website, keys), isNull(brands.userId)))
    .limit(1);
  if (orphan[0]) {
    await db
      .update(brands)
      .set({
        name: input.name,
        website: input.website,
        updatedAt: new Date(),
      })
      .where(eq(brands.id, orphan[0].id));
    return { id: orphan[0].id };
  }

  const [brand] = await db
    .insert(brands)
    .values({
      name: input.name,
      website: input.website,
    })
    .returning();
  return { id: brand.id };
}

export async function findCachedAnalysis(
  normalizedUrl: string
): Promise<PersistedAnalysis | null> {
  try {
    const db = getDb();
    const urlKeys = websiteUrlSlashAlternates(normalizedUrl);
    const [analysis] = await db
      .select()
      .from(websiteAnalyses)
      .where(inArray(websiteAnalyses.normalizedUrl, urlKeys))
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
  /** Optional precomputed knowledge hash for the raw draft. */
  knowledgeHash?: string;
}): Promise<PersistedAnalysis> {
  const db = getDb();

  const brand = await upsertBrandByWebsite({
    name: input.brandProfile.businessName,
    website: input.normalizedUrl,
  });

  const urlKeys = websiteUrlSlashAlternates(input.normalizedUrl);
  const existing = await db
    .select()
    .from(websiteAnalyses)
    .where(inArray(websiteAnalyses.normalizedUrl, urlKeys))
    .limit(1);

  let analysisId: string;
  if (existing[0]) {
    analysisId = existing[0].id;
    await db
      .update(websiteAnalyses)
      .set({
        brandId: brand.id,
        normalizedUrl: input.normalizedUrl,
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

  // Idempotent draft: reuse latest draft when knowledge hash matches.
  if (input.knowledgeHash) {
    const [latestDraft] = await db
      .select()
      .from(brandProfiles)
      .where(
        and(
          eq(brandProfiles.analysisId, analysisId),
          eq(brandProfiles.status, "draft")
        )
      )
      .orderBy(desc(brandProfiles.createdAt))
      .limit(1);
    if (
      latestDraft &&
      latestDraft.knowledgeHash &&
      latestDraft.knowledgeHash === input.knowledgeHash
    ) {
      return {
        analysisId,
        brandProfileId: latestDraft.id,
        brandProfile: input.brandProfile,
        evidence: input.evidence,
        pageCount: pageCountFromMeta(input.crawlMeta),
        detectedLocations: locationsFromMeta(input.crawlMeta),
        cached: true,
      };
    }
  }

  const [profileRow] = await db
    .insert(brandProfiles)
    .values({
      analysisId,
      brandId: brand.id,
      profile: input.brandProfile,
      evidence: input.evidence,
      status: "draft",
      knowledgeHash: input.knowledgeHash ?? null,
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

/** Mark a brand_profiles row as the published pointer for a brand. */
export async function publishBrandProfile(input: {
  brandId: string;
  brandProfileId: string;
}): Promise<void> {
  const db = getDb();
  await db
    .update(brands)
    .set({
      publishedBrandProfileId: input.brandProfileId,
      updatedAt: new Date(),
    })
    .where(eq(brands.id, input.brandId));
}

/** Insert an immutable publish_candidate or published profile (never mutates draft). */
export async function insertProfileVersion(input: {
  analysisId: string;
  brandId: string;
  profile: BrandProfile;
  evidence: DiscoveryEvidence[];
  status: "publish_candidate" | "published" | "rejected";
  sourceDraftProfileId: string;
  knowledgeHash: string;
}): Promise<{ id: string }> {
  const db = getDb();
  const [row] = await db
    .insert(brandProfiles)
    .values({
      analysisId: input.analysisId,
      brandId: input.brandId,
      profile: input.profile,
      evidence: input.evidence,
      status: input.status,
      sourceDraftProfileId: input.sourceDraftProfileId,
      knowledgeHash: input.knowledgeHash,
    })
    .returning();
  return { id: row.id };
}

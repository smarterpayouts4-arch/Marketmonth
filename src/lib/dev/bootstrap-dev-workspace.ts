import { and, desc, eq } from "drizzle-orm";

import {
  brandProfileSchema,
  strategyPreviewSchema,
  type BrandProfile,
  type StrategyIntent,
  type StrategyPreview,
} from "@/engine/discovery/brand-profile";
import { normalizeWebsiteUrl } from "@/engine/discovery/normalize-url";
import { getDb } from "@/db";
import {
  brandProfiles,
  brands,
  strategyPreviews,
  users,
  websiteAnalyses,
} from "@/db/schema";
import type { CreatePlanRequest } from "@/lib/dev/create-plan-request";
import { tryLoadZynavaFixture } from "@/lib/dev/load-zynava-fixture";
import { toDashboardBrand } from "@/lib/dev/to-dashboard-brand";
import {
  DEV_USER_EMAIL,
  DEV_USER_NAME,
  DEV_ZYNAVA_BRAND_KEY,
  ZYNAVA_NAME,
  ZYNAVA_WEBSITE,
} from "@/lib/dev/zynava-constants";

export type DevWorkspaceHandoff = {
  brandId: string;
  companyName: string;
  website: string;
  userName: string;
  hasProfile: boolean;
  hasStrategy: boolean;
  suggestedPhase: "marketing-topic";
  dashboardBrand: ReturnType<typeof toDashboardBrand>;
};

type ResolvedDiscovery = {
  brandProfile: BrandProfile | null;
  strategyPreview: StrategyPreview | null;
  source: "ids" | "payload" | "owned_db" | "fixture";
};

function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function isZynavaUrl(url: string): boolean {
  try {
    const host = new URL(normalizeWebsiteUrl(url)).hostname.replace(/^www\./, "");
    return host === "zynava.com";
  } catch {
    return /zynava\.com/i.test(url);
  }
}

async function fetchByIds(
  data: CreatePlanRequest
): Promise<ResolvedDiscovery | null> {
  if (!hasDatabase()) return null;
  if (!data.analysisId && !data.brandProfileId && !data.strategyPreviewId) {
    return null;
  }

  const db = getDb();
  let brandProfile: BrandProfile | null = null;
  let strategyPreview: StrategyPreview | null = null;
  let analysisNormalizedUrl: string | null = null;

  if (data.brandProfileId) {
    const [row] = await db
      .select()
      .from(brandProfiles)
      .where(eq(brandProfiles.id, data.brandProfileId))
      .limit(1);
    if (row) {
      const parsed = brandProfileSchema.safeParse(row.profile);
      if (parsed.success) brandProfile = parsed.data;
      const [analysis] = await db
        .select()
        .from(websiteAnalyses)
        .where(eq(websiteAnalyses.id, row.analysisId))
        .limit(1);
      analysisNormalizedUrl = analysis?.normalizedUrl ?? null;
    }
  } else if (data.analysisId) {
    const [analysis] = await db
      .select()
      .from(websiteAnalyses)
      .where(eq(websiteAnalyses.id, data.analysisId))
      .limit(1);
    if (analysis) {
      analysisNormalizedUrl = analysis.normalizedUrl;
      const [row] = await db
        .select()
        .from(brandProfiles)
        .where(eq(brandProfiles.analysisId, analysis.id))
        .orderBy(desc(brandProfiles.createdAt))
        .limit(1);
      if (row) {
        const parsed = brandProfileSchema.safeParse(row.profile);
        if (parsed.success) brandProfile = parsed.data;
      }
    }
  }

  if (data.strategyPreviewId) {
    const [row] = await db
      .select()
      .from(strategyPreviews)
      .where(eq(strategyPreviews.id, data.strategyPreviewId))
      .limit(1);
    if (row) {
      const parsed = strategyPreviewSchema.safeParse(row.preview);
      if (parsed.success) strategyPreview = parsed.data;
      if (!brandProfile) {
        const [bp] = await db
          .select()
          .from(brandProfiles)
          .where(eq(brandProfiles.id, row.brandProfileId))
          .limit(1);
        if (bp) {
          const parsedBp = brandProfileSchema.safeParse(bp.profile);
          if (parsedBp.success) brandProfile = parsedBp.data;
          const [analysis] = await db
            .select()
            .from(websiteAnalyses)
            .where(eq(websiteAnalyses.id, bp.analysisId))
            .limit(1);
          analysisNormalizedUrl = analysis?.normalizedUrl ?? null;
        }
      }
    }
  }

  if (!brandProfile && !strategyPreview) return null;

  // Do not use foreign-owned rows as the sole source unless URL is Zynava
  // (we will copy into owned brand, never reassign foreign ownership).
  const urlOk =
    (brandProfile && isZynavaUrl(brandProfile.website)) ||
    (analysisNormalizedUrl && isZynavaUrl(analysisNormalizedUrl));

  if (!urlOk && brandProfile) {
    // Still allow if business name is Zynava from current session path
    if (brandProfile.businessName.trim().toLowerCase() !== "zynava") {
      return null;
    }
  }

  return { brandProfile, strategyPreview, source: "ids" };
}

function resolveFromPayload(data: CreatePlanRequest): ResolvedDiscovery | null {
  if (!data.brandProfile && !data.strategyPreview) return null;
  const brandProfile = data.brandProfile
    ? brandProfileSchema.parse(data.brandProfile)
    : null;
  const strategyPreview = data.strategyPreview
    ? strategyPreviewSchema.parse(data.strategyPreview)
    : null;
  return { brandProfile, strategyPreview, source: "payload" };
}

async function ensureDevUserAndBrand(): Promise<{
  userId: string;
  brandId: string;
}> {
  const db = getDb();

  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, DEV_USER_EMAIL))
    .limit(1);

  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        email: DEV_USER_EMAIL,
        name: DEV_USER_NAME,
      })
      .returning();
  } else if (user.name !== DEV_USER_NAME) {
    await db
      .update(users)
      .set({ name: DEV_USER_NAME })
      .where(eq(users.id, user.id));
  }

  let [brand] = await db
    .select()
    .from(brands)
    .where(
      and(eq(brands.devKey, DEV_ZYNAVA_BRAND_KEY), eq(brands.userId, user.id))
    )
    .limit(1);

  if (!brand) {
    // Also match owned brand by website if key missing (pre-migration rows)
    [brand] = await db
      .select()
      .from(brands)
      .where(
        and(
          eq(brands.userId, user.id),
          eq(brands.website, ZYNAVA_WEBSITE)
        )
      )
      .limit(1);

    if (brand) {
      await db
        .update(brands)
        .set({
          devKey: DEV_ZYNAVA_BRAND_KEY,
          name: ZYNAVA_NAME,
          updatedAt: new Date(),
        })
        .where(eq(brands.id, brand.id));
      brand = { ...brand, devKey: DEV_ZYNAVA_BRAND_KEY, name: ZYNAVA_NAME };
    }
  }

  if (!brand) {
    [brand] = await db
      .insert(brands)
      .values({
        userId: user.id,
        devKey: DEV_ZYNAVA_BRAND_KEY,
        name: ZYNAVA_NAME,
        website: ZYNAVA_WEBSITE,
      })
      .returning();
  } else {
    // Never claim another user's brand — we already scoped by userId.
    await db
      .update(brands)
      .set({
        name: ZYNAVA_NAME,
        website: ZYNAVA_WEBSITE,
        updatedAt: new Date(),
      })
      .where(and(eq(brands.id, brand.id), eq(brands.userId, user.id)));
  }

  return { userId: user.id, brandId: brand.id };
}

async function loadOwnedDiscovery(
  brandId: string
): Promise<ResolvedDiscovery | null> {
  if (!hasDatabase()) return null;
  const db = getDb();
  const [analysis] = await db
    .select()
    .from(websiteAnalyses)
    .where(eq(websiteAnalyses.brandId, brandId))
    .orderBy(desc(websiteAnalyses.createdAt))
    .limit(1);

  if (!analysis) return null;

  const [profileRow] = await db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.brandId, brandId))
    .orderBy(desc(brandProfiles.createdAt))
    .limit(1);

  if (!profileRow) return null;

  const brandProfile = brandProfileSchema.safeParse(profileRow.profile);
  if (!brandProfile.success) return null;

  const [strategyRow] = await db
    .select()
    .from(strategyPreviews)
    .where(eq(strategyPreviews.brandProfileId, profileRow.id))
    .orderBy(desc(strategyPreviews.createdAt))
    .limit(1);

  const strategyPreview = strategyRow
    ? strategyPreviewSchema.safeParse(strategyRow.preview)
    : null;

  return {
    brandProfile: brandProfile.data,
    strategyPreview: strategyPreview?.success ? strategyPreview.data : null,
    source: "owned_db",
  };
}

/**
 * Persist discovery under the owned Zynava brand.
 * Never reassigns a brand owned by another user.
 * neon-http has no transactions — operations are sequential with ownership checks.
 */
async function persistUnderOwnedBrand(input: {
  brandId: string;
  brandProfile: BrandProfile;
  strategyPreview: StrategyPreview | null;
  intent?: StrategyIntent;
}): Promise<void> {
  const db = getDb();
  const normalizedUrl = normalizeWebsiteUrl(ZYNAVA_WEBSITE);

  // Guard: owned brand still ours
  const [owned] = await db
    .select()
    .from(brands)
    .where(
      and(eq(brands.id, input.brandId), eq(brands.devKey, DEV_ZYNAVA_BRAND_KEY))
    )
    .limit(1);
  if (!owned?.userId) {
    throw new Error("Owned Zynava brand missing; aborting persist.");
  }

  // If an analysis exists for this URL and points at a foreign-owned brand, do not steal it.
  const [existingAnalysis] = await db
    .select()
    .from(websiteAnalyses)
    .where(eq(websiteAnalyses.normalizedUrl, normalizedUrl))
    .limit(1);

  let analysisId: string;

  if (existingAnalysis) {
    let foreignOwned = false;
    if (
      existingAnalysis.brandId &&
      existingAnalysis.brandId !== input.brandId
    ) {
      const [linked] = await db
        .select()
        .from(brands)
        .where(eq(brands.id, existingAnalysis.brandId))
        .limit(1);
      foreignOwned = Boolean(
        linked?.userId && linked.userId !== owned.userId
      );
    }

    if (foreignOwned) {
      // Never claim foreign brand — copy into a dedicated owned analysis URL
      const ownedUrl = `${normalizedUrl.replace(/\/$/, "")}/__dev_zynava`;
      const [ownedAnalysis] = await db
        .select()
        .from(websiteAnalyses)
        .where(eq(websiteAnalyses.normalizedUrl, ownedUrl))
        .limit(1);
      if (ownedAnalysis) {
        analysisId = ownedAnalysis.id;
        await db
          .update(websiteAnalyses)
          .set({ brandId: input.brandId })
          .where(eq(websiteAnalyses.id, analysisId));
      } else {
        const [created] = await db
          .insert(websiteAnalyses)
          .values({
            brandId: input.brandId,
            normalizedUrl: ownedUrl,
            crawlMeta: { source: "dev-bootstrap", intent: input.intent },
          })
          .returning();
        analysisId = created.id;
      }
    } else {
      // Orphan, unowned, or already our brand — attach safely
      analysisId = existingAnalysis.id;
      await db
        .update(websiteAnalyses)
        .set({ brandId: input.brandId })
        .where(eq(websiteAnalyses.id, analysisId));
    }
  } else {
    const [created] = await db
      .insert(websiteAnalyses)
      .values({
        brandId: input.brandId,
        normalizedUrl,
        crawlMeta: { source: "dev-bootstrap", intent: input.intent },
      })
      .returning();
    analysisId = created.id;
  }

  const profile = {
    ...input.brandProfile,
    businessName: input.brandProfile.businessName || ZYNAVA_NAME,
    website: ZYNAVA_WEBSITE,
  };

  const [profileRow] = await db
    .insert(brandProfiles)
    .values({
      analysisId,
      brandId: input.brandId,
      profile,
      evidence: [],
    })
    .returning();

  if (input.strategyPreview) {
    await db.insert(strategyPreviews).values({
      brandProfileId: profileRow.id,
      preview: input.strategyPreview,
    });
  }
}

function handoffFrom(
  brandId: string,
  brandProfile: BrandProfile | null,
  strategyPreview: StrategyPreview | null
): DevWorkspaceHandoff {
  const hasProfile = Boolean(brandProfile);
  const hasStrategy = Boolean(strategyPreview);
  return {
    brandId,
    companyName: brandProfile?.businessName?.trim() || ZYNAVA_NAME,
    website: brandProfile?.website?.trim() || ZYNAVA_WEBSITE,
    userName: DEV_USER_NAME,
    hasProfile,
    hasStrategy,
    suggestedPhase: "marketing-topic",
    dashboardBrand: toDashboardBrand(brandProfile),
  };
}

function resolveLocalOnly(
  data: CreatePlanRequest,
  resolved: ResolvedDiscovery | null
): DevWorkspaceHandoff {
  let next = resolved ?? resolveFromPayload(data);
  if (!next?.brandProfile) {
    const fixture = tryLoadZynavaFixture();
    if (fixture) {
      next = {
        brandProfile: fixture.brandProfile,
        strategyPreview: fixture.strategyPreview,
        source: "fixture",
      };
    }
  }
  if (!next?.brandProfile) {
    throw new Error(
      "No Zynava research found. Analyze https://zynava.com first, or ensure data/fixtures/zynava-discovery.csv exists."
    );
  }
  return handoffFrom(
    `fixture:${DEV_ZYNAVA_BRAND_KEY}`,
    next.brandProfile,
    next.strategyPreview
  );
}

/**
 * Bootstrap the development Zynava workspace.
 * Precedence: validated IDs → validated payload → owned DB → CSV fixture → error.
 * If Neon is unreachable or schema is not migrated, fall back to fixture/cookie path
 * so Create Plan still opens the Zynava dashboard in local development.
 */
export async function bootstrapDevWorkspace(
  data: CreatePlanRequest
): Promise<DevWorkspaceHandoff> {
  let resolved: ResolvedDiscovery | null = null;
  try {
    resolved = (await fetchByIds(data)) ?? resolveFromPayload(data);
  } catch {
    resolved = resolveFromPayload(data);
  }

  if (!hasDatabase()) {
    return resolveLocalOnly(data, resolved);
  }

  try {
    const owned = await ensureDevUserAndBrand();
    const brandId = owned.brandId;

    if (!resolved?.brandProfile) {
      const fromOwned = await loadOwnedDiscovery(brandId);
      if (fromOwned) resolved = fromOwned;
    }

    if (!resolved?.brandProfile) {
      const fixture = tryLoadZynavaFixture();
      if (fixture) {
        resolved = {
          brandProfile: fixture.brandProfile,
          strategyPreview: fixture.strategyPreview,
          source: "fixture",
        };
      }
    }

    if (!resolved?.brandProfile) {
      throw new Error(
        "No Zynava research found. Analyze https://zynava.com first, or run npm run seed:zynava-dev."
      );
    }

    if (resolved.source !== "owned_db") {
      try {
        await persistUnderOwnedBrand({
          brandId,
          brandProfile: resolved.brandProfile,
          strategyPreview: resolved.strategyPreview,
          intent: data.intent,
        });
      } catch {
        // Cookie + session handoff still work without persist
      }
    }

    return handoffFrom(
      brandId,
      resolved.brandProfile,
      resolved.strategyPreview
    );
  } catch {
    return resolveLocalOnly(data, resolved);
  }
}

import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { brandProfiles, brands } from "@/db/schema";
import { brandProfileSchema } from "@/engine/discovery/brand-profile";
import { isDevelopmentAuthBypassEnabled } from "@/lib/auth/auth-mode";
import { readActiveBrandCookie } from "@/lib/dev/active-brand-cookie";
import { tryLoadCompanyBrand } from "@/lib/company-profile/load-company-brand";
import { toDashboardBrand } from "@/lib/dev/to-dashboard-brand";
import {
  DEV_USER_NAME,
  DEV_ZYNAVA_BRAND_KEY,
  ZYNAVA_NAME,
  ZYNAVA_WEBSITE,
} from "@/lib/dev/zynava-constants";

/**
 * Canonical dashboard context for development bypass:
 * signed cookie (+ Neon profile) → CSV fixture fallback.
 */
export async function GET() {
  if (!isDevelopmentAuthBypassEnabled()) {
    return NextResponse.json({ ok: false, active: false });
  }

  const cookie = await readActiveBrandCookie();
  if (cookie) {
    let dashboardBrand = toDashboardBrand({
      businessName: cookie.companyName,
      website: cookie.website,
      description: `${cookie.companyName} development workspace.`,
      audience: "Primary audience",
      products: [],
      services: [],
      indexedProducts: [],
      valueProposition: "",
      brandVoice: "",
      marketingOpportunity: "",
      colors: [],
      socialProfiles: [],
      seoSummary: {
        metadataCompleteness: "partial",
        pageSpeedNote: "",
        technicalObservations: [],
        contentOpportunities: [],
      },
      competitors: [],
    });

    if (
      process.env.DATABASE_URL &&
      cookie.brandId &&
      !cookie.brandId.startsWith("fixture:")
    ) {
      try {
        const db = getDb();
        const [owned] = await db
          .select()
          .from(brands)
          .where(
            and(
              eq(brands.id, cookie.brandId),
              eq(brands.devKey, DEV_ZYNAVA_BRAND_KEY)
            )
          )
          .limit(1);
        if (owned) {
          const [profileRow] = await db
            .select()
            .from(brandProfiles)
            .where(eq(brandProfiles.brandId, owned.id))
            .orderBy(desc(brandProfiles.createdAt))
            .limit(1);
          if (profileRow) {
            const parsed = brandProfileSchema.safeParse(profileRow.profile);
            if (parsed.success) {
              dashboardBrand = toDashboardBrand(parsed.data);
            }
          }
        }
      } catch {
        // keep cookie-derived stub
      }
    }

    return NextResponse.json({
      ok: true,
      active: true,
      companyName: cookie.companyName,
      website: cookie.website,
      userName: cookie.userName,
      brandId: cookie.brandId,
      hasProfile: cookie.hasProfile,
      hasStrategy: cookie.hasStrategy,
      suggestedPhase: "marketing-topic" as const,
      dashboardBrand,
    });
  }

  const fixture = tryLoadCompanyBrand("zynava.com");
  if (fixture) {
    const dashboardBrand = toDashboardBrand(fixture.brandProfile);
    return NextResponse.json({
      ok: true,
      active: true,
      companyName: fixture.brandProfile.businessName || ZYNAVA_NAME,
      website: fixture.brandProfile.website || ZYNAVA_WEBSITE,
      userName: DEV_USER_NAME,
      brandId: `fixture:${DEV_ZYNAVA_BRAND_KEY}`,
      hasProfile: true,
      hasStrategy: Boolean(fixture.strategyPreview),
      suggestedPhase: "marketing-topic" as const,
      dashboardBrand,
    });
  }

  return NextResponse.json({ ok: true, active: false });
}

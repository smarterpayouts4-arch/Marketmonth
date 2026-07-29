/**
 * Load approved CSV → insert status=draft brand_profiles on owned Zynava brand.
 * Used to bootstrap the vertical publish path when Neon has no drafts.
 */
import { config } from "dotenv";
import { readFileSync } from "node:fs";

config({ path: ".env.local" });
config({ path: ".env" });

import { and, eq } from "drizzle-orm";

import { parseFixtureCsv } from "../src/brain/content/repository/parse-fixture-csv";
import { assertMarketMonthDatabase } from "../src/db/safety/assert-marketmonth-db";
import { getDb } from "../src/db";
import { brands, users } from "../src/db/schema";
import {
  brandProfileToCompanyKnowledge,
  computeKnowledgeHash,
} from "../src/engine/discovery/company-knowledge";
import { persistAnalysis } from "../src/engine/discovery/persist";
import type { BrandProfile } from "../src/engine/discovery/brand-profile";
import { makeEvidence } from "../src/lib/discovery/evidence";
import {
  DEV_USER_EMAIL,
  DEV_ZYNAVA_BRAND_KEY,
  ZYNAVA_WEBSITE,
} from "../src/lib/dev/zynava-constants";
import { companyArtifactPaths } from "../src/lib/company-profile/company-paths";

async function main() {
  await assertMarketMonthDatabase({ mode: "seed" });
  const paths = companyArtifactPaths("zynava.com");
  const text = readFileSync(paths.approvedCsv, "utf8");
  const context = parseFixtureCsv(text);
  if (!context) throw new Error("parseFixtureCsv returned null");

  const profile: BrandProfile = {
    businessName: context.brandName,
    website: context.website || ZYNAVA_WEBSITE,
    description: context.description || "",
    audience: context.audience || "",
    products: context.products ?? [],
    services: context.services ?? [],
    indexedProducts: (context.indexedProducts ?? []).map((p) => ({
      name: p.name,
      price: p.price,
      sourceUrl: p.sourceUrl?.trim() || ZYNAVA_WEBSITE,
    })),
    valueProposition: context.valueProposition || "",
    brandVoice: context.brandVoice || "",
    marketingOpportunity: context.marketingOpportunity || "",
    colors: [],
    socialProfiles: [],
    seoSummary: {
      metadataCompleteness: "partial",
      pageSpeedNote: "",
      technicalObservations: [],
      contentOpportunities: context.contentOpportunities ?? [],
    },
    competitors: [],
  };

  const evidence = Object.values(context.evidenceById).map((ev) =>
    makeEvidence({
      field: ev.field,
      kind:
        ev.evidenceType === "inferred" ||
        ev.evidenceType === "recommended" ||
        ev.evidenceType === "user_confirmed"
          ? ev.evidenceType
          : "observed",
      value: ev.value,
      sourceUrl: ev.sourceUrl || ZYNAVA_WEBSITE,
      sourcePageType: "other",
      confidence:
        ev.confidence === "high" || ev.confidence === "low"
          ? ev.confidence
          : "medium",
    })
  );

  const knowledge = brandProfileToCompanyKnowledge(profile, evidence);
  const knowledgeHash = computeKnowledgeHash({ knowledge, evidence });

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, DEV_USER_EMAIL))
    .limit(1);
  if (!user) throw new Error("Dev user missing — run seed:marketmonth-db");

  const [brand] = await db
    .select()
    .from(brands)
    .where(
      and(eq(brands.devKey, DEV_ZYNAVA_BRAND_KEY), eq(brands.userId, user.id))
    )
    .limit(1);
  if (!brand) throw new Error("Owned brand missing — run seed:marketmonth-db");

  // Ensure website matches so upsertBrandByWebsite lands on this brand
  await db
    .update(brands)
    .set({ website: ZYNAVA_WEBSITE, name: profile.businessName, updatedAt: new Date() })
    .where(eq(brands.id, brand.id));

  const persisted = await persistAnalysis({
    normalizedUrl: ZYNAVA_WEBSITE,
    brandProfile: { ...profile, website: ZYNAVA_WEBSITE },
    crawlMeta: {
      pageCount: 8,
      kinds: ["home", "about", "faq", "products", "how_it_works", "blog", "contact", "other"],
      pageSummaries: [
        {
          url: ZYNAVA_WEBSITE,
          pageType: "home",
          title: "Home",
          collectionMethod: "fetch" as const,
        },
        {
          url: `${ZYNAVA_WEBSITE}/about`,
          pageType: "about",
          title: "About",
          collectionMethod: "fetch" as const,
        },
        {
          url: `${ZYNAVA_WEBSITE}/faq`,
          pageType: "faq",
          title: "FAQ",
          collectionMethod: "fetch" as const,
        },
        {
          url: `${ZYNAVA_WEBSITE}/products`,
          pageType: "products",
          title: "Products",
          collectionMethod: "fetch" as const,
        },
      ],
      csvSchemaVersion: "1.1",
    },
    evidence,
    knowledgeHash,
  });

  console.log(
    JSON.stringify(
      {
        brandId: brand.id,
        brandProfileId: persisted.brandProfileId,
        knowledgeHash,
        catalogCount: profile.indexedProducts.length,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

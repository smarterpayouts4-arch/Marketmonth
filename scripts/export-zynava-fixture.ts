/**
 * Export owned Zynava discovery rows from Neon → data/fixtures/zynava-discovery.csv
 * Usage: npm run export:zynava-fixture
 */
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { and, desc, eq } from "drizzle-orm";

config({ path: ".env.local" });
config({ path: ".env" });

import { getDb } from "../src/db";
import {
  brandProfiles,
  brands,
  strategyPreviews,
  users,
  websiteAnalyses,
} from "../src/db/schema";
import { buildDiscoveryCsvDocument } from "../src/lib/dev/discovery-csv-rows";
import {
  DEV_USER_EMAIL,
  DEV_ZYNAVA_BRAND_KEY,
  ZYNAVA_WEBSITE,
} from "../src/lib/dev/zynava-constants";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to export the Zynava fixture.");
  }

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, DEV_USER_EMAIL))
    .limit(1);
  if (!user) {
    throw new Error(
      `Dev user ${DEV_USER_EMAIL} not found. Run Create Plan with DEV_AUTH_BYPASS or npm run seed:zynava-dev first.`
    );
  }

  const [brand] = await db
    .select()
    .from(brands)
    .where(
      and(eq(brands.devKey, DEV_ZYNAVA_BRAND_KEY), eq(brands.userId, user.id))
    )
    .limit(1);
  if (!brand) {
    throw new Error("Owned Zynava brand (dev-zynava) not found.");
  }

  const [profileRow] = await db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.brandId, brand.id))
    .orderBy(desc(brandProfiles.createdAt))
    .limit(1);
  if (!profileRow) {
    throw new Error("No brand profile on owned Zynava brand.");
  }

  const profile = profileRow.profile;
  const [strategyRow] = await db
    .select()
    .from(strategyPreviews)
    .where(eq(strategyPreviews.brandProfileId, profileRow.id))
    .orderBy(desc(strategyPreviews.createdAt))
    .limit(1);

  const [analysis] = await db
    .select()
    .from(websiteAnalyses)
    .where(eq(websiteAnalyses.id, profileRow.analysisId))
    .limit(1);

  const sourceUrl = analysis?.normalizedUrl || ZYNAVA_WEBSITE;
  const csv = buildDiscoveryCsvDocument({
    profile,
    evidence: profileRow.evidence ?? [],
    crawlMeta: analysis?.crawlMeta ?? null,
    strategyPreview: strategyRow?.preview ?? null,
    sourceUrl,
    notes: "Exported from Neon owned brand",
  });

  const out = join(process.cwd(), "data", "fixtures", "zynava-discovery.csv");
  writeFileSync(out, csv, "utf8");
  const rowCount = csv.trim().split("\n").length - 1;
  console.log(`Wrote ${rowCount} rows → ${out}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

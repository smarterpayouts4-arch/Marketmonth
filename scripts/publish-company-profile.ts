/**
 * Sole approved-CSV materializer (clean-slate).
 *
 * Usage:
 *   npm run publish:company-profile
 *   npm run publish:company-profile -- --force
 *   npm run publish:company-profile -- --skip-gate   (debug only)
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { and, desc, eq } from "drizzle-orm";

config({ path: ".env.local" });
config({ path: ".env" });

import { assertMarketMonthDatabase } from "../src/db/safety/assert-marketmonth-db";
import { getDb } from "../src/db";
import { brandProfiles, brands, users } from "../src/db/schema";
import { publishCompanyProfile } from "../src/engine/discovery/publish/publish-company-profile";
import {
  DEV_USER_EMAIL,
  DEV_ZYNAVA_BRAND_KEY,
  ZYNAVA_WEBSITE,
} from "../src/lib/dev/zynava-constants";
import { companyArtifactPaths } from "../src/lib/company-profile/company-paths";

async function resolveOwnedBrand() {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, DEV_USER_EMAIL))
    .limit(1);
  if (!user) {
    throw new Error(
      `Auth.js user ${DEV_USER_EMAIL} missing. Run: npm run seed:marketmonth-db`
    );
  }
  const [owned] = await db
    .select()
    .from(brands)
    .where(
      and(eq(brands.devKey, DEV_ZYNAVA_BRAND_KEY), eq(brands.userId, user.id))
    )
    .limit(1);
  if (!owned) {
    throw new Error(
      `Owned brand ${DEV_ZYNAVA_BRAND_KEY} missing. Run: npm run seed:marketmonth-db`
    );
  }
  return owned;
}

async function main() {
  const force = process.argv.includes("--force");
  const skipGate = process.argv.includes("--skip-gate");

  await assertMarketMonthDatabase({ mode: "publish" });

  const brand = await resolveOwnedBrand();
  const db = getDb();

  const [draft] = await db
    .select()
    .from(brandProfiles)
    .where(
      and(eq(brandProfiles.brandId, brand.id), eq(brandProfiles.status, "draft"))
    )
    .orderBy(desc(brandProfiles.createdAt))
    .limit(1);

  if (!draft) {
    throw new Error(
      "No draft brand_profiles row. Run Discovery Analyze first (creates status=draft only)."
    );
  }

  const paths = companyArtifactPaths("zynava.com");
  const result = await publishCompanyProfile({
    brandId: brand.id,
    draftProfileId: draft.id,
    approvedCsvPath: paths.approvedCsv,
    overridesPath: paths.overridesJson,
    companyId: paths.companyId,
    force,
    skipGate,
  });

  const metaPath = join(
    dirname(paths.neonPublishMeta),
    "company-publish-meta.json"
  );
  mkdirSync(dirname(metaPath), { recursive: true });
  writeFileSync(
    metaPath,
    JSON.stringify(
      {
        ...result,
        brandId: brand.id,
        draftProfileId: draft.id,
        website: ZYNAVA_WEBSITE,
        writer: "publish:company-profile",
        publishedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(JSON.stringify(result, null, 2));
  console.log(`Meta → ${metaPath}`);
  if (skipGate) {
    console.warn("WARNING: --skip-gate used — not for production publish");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

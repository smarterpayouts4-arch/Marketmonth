/**
 * Seed Auth.js dev user + owned Zynava brand on a dedicated MarketMonth Neon.
 * Requires MARKETMONTH_DB_MARKER + app_metadata (run migrate + db-assert-safety first).
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { and, eq } from "drizzle-orm";

import { getDb } from "../src/db";
import { brands, users } from "../src/db/schema";
import {
  assertMarketMonthDatabase,
  upsertAppMetadata,
} from "../src/db/safety/assert-marketmonth-db";
import {
  DEV_USER_EMAIL,
  DEV_ZYNAVA_BRAND_KEY,
  ZYNAVA_WEBSITE,
} from "../src/lib/dev/zynava-constants";

async function main() {
  await assertMarketMonthDatabase({
    mode: "migrate",
    allowMissingMetadata: true,
  });
  await upsertAppMetadata({ environment: "development" });
  await assertMarketMonthDatabase({ mode: "seed" });

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
        name: "MarketMonth Dev",
      })
      .returning();
    console.log(`Created user ${DEV_USER_EMAIL}`);
  } else {
    console.log(`User exists ${DEV_USER_EMAIL}`);
  }

  const [existing] = await db
    .select()
    .from(brands)
    .where(
      and(eq(brands.devKey, DEV_ZYNAVA_BRAND_KEY), eq(brands.userId, user.id))
    )
    .limit(1);

  if (existing) {
    console.log(`Brand ${DEV_ZYNAVA_BRAND_KEY} already owned by user`);
    return;
  }

  const [byKey] = await db
    .select()
    .from(brands)
    .where(eq(brands.devKey, DEV_ZYNAVA_BRAND_KEY))
    .limit(1);

  if (byKey) {
    await db
      .update(brands)
      .set({ userId: user.id, website: ZYNAVA_WEBSITE, updatedAt: new Date() })
      .where(eq(brands.id, byKey.id));
    console.log(`Attached existing brand ${byKey.id} to user`);
    return;
  }

  const [brand] = await db
    .insert(brands)
    .values({
      userId: user.id,
      devKey: DEV_ZYNAVA_BRAND_KEY,
      name: "Zynava",
      website: ZYNAVA_WEBSITE,
    })
    .returning();
  console.log(`Created owned brand ${brand.id}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

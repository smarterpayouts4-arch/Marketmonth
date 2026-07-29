/**
 * Fail-closed dual marker check (env + app_metadata).
 * Usage: npx tsx scripts/db-assert-safety.ts [--allow-missing-metadata]
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import {
  assertMarketMonthDatabase,
  upsertAppMetadata,
} from "../src/db/safety/assert-marketmonth-db";

async function main() {
  const allowMissing = process.argv.includes("--allow-missing-metadata");
  await assertMarketMonthDatabase({
    mode: allowMissing ? "migrate" : "seed",
    allowMissingMetadata: allowMissing,
  });
  if (allowMissing) {
    await upsertAppMetadata({ environment: "development" });
    console.log("app_metadata upserted");
  }
  console.log("db-safety: OK");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

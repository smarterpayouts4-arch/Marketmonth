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
  const {
    probeLlmUsageDailyTable,
    probeContentAtomsTable,
  } = await import("../src/brain/llm/cost-caps");
  const usage = await probeLlmUsageDailyTable();
  const atoms = await probeContentAtomsTable();
  console.log(
    `db-probe llm_usage_daily: ${usage.ok ? "OK" : "MISSING"} — ${usage.detail}`
  );
  console.log(
    `db-probe content_atoms: ${atoms.ok ? "OK" : "MISSING"} — ${atoms.detail}`
  );
  console.log("db-safety: OK");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

/**
 * Seed Neon owned Zynava brand from data/fixtures/zynava-discovery.csv
 * Usage: npm run seed:zynava-dev
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { bootstrapDevWorkspace } from "../src/lib/dev/bootstrap-dev-workspace";
import { loadZynavaFixture } from "../src/lib/dev/load-zynava-fixture";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed Zynava.");
  }

  const fixture = loadZynavaFixture();
  const handoff = await bootstrapDevWorkspace({
    brandProfile: fixture.brandProfile,
    strategyPreview: fixture.strategyPreview ?? undefined,
  });

  console.log("Seeded owned Zynava workspace:");
  console.log(`  brandId: ${handoff.brandId}`);
  console.log(`  company: ${handoff.companyName}`);
  console.log(`  website: ${handoff.website}`);
  console.log(`  strategy: ${handoff.hasStrategy}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

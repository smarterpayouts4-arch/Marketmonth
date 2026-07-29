/**
 * Seed Neon owned company brand from data/companies/<company>/approved.csv
 * Usage: npm run seed:dev-company -- --company zynava.com
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { bootstrapDevWorkspace } from "../src/lib/dev/bootstrap-dev-workspace";
import { loadCompanyBrand } from "../src/lib/company-profile/load-company-brand";

function companyFromArgv(): string {
  const idx = process.argv.indexOf("--company");
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1]!;
  const eq = process.argv.find((a) => a.startsWith("--company="));
  if (eq) return eq.slice("--company=".length);
  return "zynava.com";
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to seed a company workspace.");
  }

  const companyId = companyFromArgv();
  const fixture = loadCompanyBrand(companyId);
  const handoff = await bootstrapDevWorkspace({
    brandProfile: fixture.brandProfile,
    strategyPreview: fixture.strategyPreview ?? undefined,
  });

  console.log(`Seeded owned workspace for ${companyId}:`);
  console.log(`  brandId: ${handoff.brandId}`);
  console.log(`  company: ${handoff.companyName}`);
  console.log(`  website: ${handoff.website}`);
  console.log(`  strategy: ${handoff.hasStrategy}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

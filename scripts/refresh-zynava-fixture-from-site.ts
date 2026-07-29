/**
 * Diagnostic-only: propose a Zynava discovery CSV from live crawl or frozen corpus.
 * Never writes data/companies/zynava.com/approved.csv — only *.proposed.csv.
 *
 * Sole approved CSV writer: `npm run publish:company-profile`.
 *
 * Usage:
 *   npm run refresh:zynava-fixture
 *   npm run refresh:zynava-fixture -- --live
 *   npm run refresh:zynava-fixture -- --force   (overwrite proposed even if gate fails)
 */
import { config } from "dotenv";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

config({ path: ".env.local" });
config({ path: ".env" });

import { withWriteLock } from "../src/brain/store/write-lock";
import {
  buildDiscoveryProfileFromCorpus,
  crawlWebsite,
  ensureExtraPages,
  evaluateDiscoveryAcceptance,
  getCompanyDiscoveryConfig,
  persistCrawlPageSnapshots,
} from "../src/engine/discovery";
import {
  applyApprovedOverrides,
  evidenceFromOverrides,
  loadApprovedOverrides,
} from "../src/engine/discovery/fixture-propose/apply-overrides";
import {
  corpusFromFrozenPages,
  loadFrozenCorpus,
} from "../src/engine/discovery/reconcile/frozen-corpus";
import {
  buildDiscoveryCsvDocument,
  DISCOVERY_CSV_SCHEMA_VERSION,
} from "../src/lib/company-profile/csv-contract";
import { companyArtifactPaths } from "../src/lib/company-profile/company-paths";
import { loadCompanyBrand } from "../src/lib/company-profile/load-company-brand";
import {
  ZYNAVA_PLATFORM_CAPABILITIES,
  ZYNAVA_WEBSITE,
} from "../src/lib/dev/zynava-constants";

async function main() {
  const force = process.argv.includes("--force");
  const preferLive = process.argv.includes("--live");
  const paths = companyArtifactPaths("zynava.com");
  const retrievedAt = new Date().toISOString();

  let corpus;
  let sourceNote: string;

  const frozen = loadFrozenCorpus(paths.frozenCorpusDir);
  const hasFrozen =
    "pages" in frozen && frozen.pages.length > 0 && !preferLive;

  if (hasFrozen && "pages" in frozen) {
    corpus = corpusFromFrozenPages(frozen.pages);
    sourceNote = `proposed from frozen Layer-1 (${frozen.pages.length} pages)`;
    console.log(`Using frozen corpus: ${paths.frozenCorpusDir}`);
  } else {
    console.log(`Crawling ${ZYNAVA_WEBSITE}…`);
    corpus = await crawlWebsite(ZYNAVA_WEBSITE);
    const extras = getCompanyDiscoveryConfig(ZYNAVA_WEBSITE).extraSeedUrls;
    corpus = await ensureExtraPages(corpus, extras);
    sourceNote = "proposed from live crawl + company discovery config";
    const { dir: pagesDir, manifest } = persistCrawlPageSnapshots({
      companyId: "zynava.com",
      corpus,
      retrievedAt,
    });
    console.log(
      `Layer-1 snapshots: ${manifest.pageCount} pages → ${pagesDir}`
    );
  }

  console.log(
    `Corpus: ${corpus.pages.length} pages — ${corpus.pages
      .map((p) => `${p.kind}:${new URL(p.url).pathname}`)
      .join(", ")}`
  );

  const build = await buildDiscoveryProfileFromCorpus({
    corpus,
    website: ZYNAVA_WEBSITE,
    curatedCapabilities: [...ZYNAVA_PLATFORM_CAPABILITIES],
    // Proposed fixture must be reproducible without LLM drift for observed path
    derivedSource: "rules",
  });

  const overrides = loadApprovedOverrides(paths.overridesJson);
  const profile = applyApprovedOverrides(build.profile, overrides);

  if (profile.indexedProducts.length < 4) {
    throw new Error(
      `Expected ≥4 scrubbed indexed products; got ${profile.indexedProducts.length}: ${profile.indexedProducts
        .map((p) => p.name)
        .join(", ")}`
    );
  }

  const cleanEvidence = [
    ...build.evidence.filter((ev) => {
      if (ev.field !== "indexedProduct") return true;
      return !/\b(search|comparison|compare|builder|advisor|filter|engine|tool|explorer|finder|quiz|platform)\b/i.test(
        ev.value
      );
    }),
    ...evidenceFromOverrides(overrides, ZYNAVA_WEBSITE),
  ];

  const gate = evaluateDiscoveryAcceptance({
    profile,
    evidence: cleanEvidence,
    corpus,
  });
  console.log("Acceptance gate:", JSON.stringify(gate, null, 2));
  console.log("Build diagnostics:", build.diagnostics);

  if (!gate.accepted && !force) {
    console.warn(
      "Gate failed — proposed CSV not written. Re-run with --force to write anyway."
    );
    process.exitCode = 2;
    return;
  }

  // Preserve strategy_preview only (explicit allow-list), never observed inheritance
  const base = existsSync(paths.approvedCsv)
    ? loadCompanyBrand("zynava.com")
    : null;
  const strategyPreview = base?.strategyPreview ?? null;

  const notes = [
    `Proposed Zynava discovery CSV (${sourceNote}); schema ${DISCOVERY_CSV_SCHEMA_VERSION}`,
    "Does not replace approved CSV — use publish:company-profile",
    ...build.diagnostics.notes,
  ].join("; ");

  const csv = buildDiscoveryCsvDocument({
    profile,
    evidence: cleanEvidence,
    crawlMeta: build.crawlMeta,
    strategyPreview,
    sourceUrl: ZYNAVA_WEBSITE,
    retrievedAt,
    notes,
  });

  mkdirSync(dirname(paths.proposedCsv), { recursive: true });
  await withWriteLock(async () => {
    writeFileSync(paths.proposedCsv, csv, "utf8");
  });
  const rowCount = csv.trim().split("\n").length - 1;
  console.log(`Wrote ${rowCount} rows → ${paths.proposedCsv}`);
  console.log(
    "indexedProducts:",
    profile.indexedProducts.map((p) => `${p.name} <${p.sourceUrl}>`).join("; ")
  );
  console.log("products[] (platform curated):", profile.products.join(", "));
  console.log(
    "Approved CSV untouched:",
    paths.approvedCsv,
    existsSync(paths.approvedCsv) ? "(exists)" : "(missing)"
  );
  console.log(
    "Sole Idea Lab SoT writer: npm run publish:company-profile (not this script)"
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

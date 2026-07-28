/**
 * Refresh data/fixtures/zynava-discovery.csv from a live zynava.com crawl.
 * DB-free — writes only via buildDiscoveryCsvDocument.
 *
 * Usage:
 *   npm run refresh:zynava-fixture -- --force
 * Without --force: runs crawl + acceptance gate, writes page snapshots, does not overwrite CSV.
 */
import { config } from "dotenv";
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });
config({ path: ".env" });

import {
  buildCrawlMeta,
  buildDiscoveryEvidence,
  contentOpportunitiesForCatalog,
  crawlWebsite,
  evaluateDiscoveryAcceptance,
  extractBrandSignals,
  findSocialLinks,
  persistCrawlPageSnapshots,
} from "../src/engine/discovery";
import type { BrandProfile } from "../src/engine/discovery/brand-profile";
import type { CrawledPage, CrawlCorpus } from "../src/engine/discovery/types";
import { fetchStaticPage } from "../src/lib/discovery/browser/fetch-static-page";
import {
  buildDiscoveryCsvDocument,
  DISCOVERY_CSV_SCHEMA_VERSION,
} from "../src/lib/dev/discovery-csv-rows";
import { loadZynavaFixture } from "../src/lib/dev/load-zynava-fixture";
import { ZYNAVA_WEBSITE } from "../src/lib/dev/zynava-constants";

const PLATFORM_PRODUCTS = [
  "Supplement search",
  "Price comparison",
  "Supplement plan builder",
  "AI supplement advisor",
] as const;

const EXTRA_URLS = [
  "https://zynava.com/tools/ingredient-explorer",
  "https://zynava.com/how-it-works",
] as const;

async function ensureExtraPages(corpus: CrawlCorpus): Promise<CrawlCorpus> {
  const have = new Set(corpus.pages.map((p) => p.url.replace(/\/$/, "")));
  const pages: CrawledPage[] = [...corpus.pages];

  for (const url of EXTRA_URLS) {
    const key = url.replace(/\/$/, "");
    if ([...have].some((h) => h === key || h.startsWith(key))) continue;
    try {
      const collected = await fetchStaticPage({
        url,
        pageType: /how-it-works/i.test(url) ? "how_it_works" : "other",
      });
      if (!collected.html || collected.html.length < 200) continue;
      const kind = /how-it-works/i.test(url) ? "how_it_works" : "other";
      pages.push({
        url: collected.url || url,
        status: 200,
        html: collected.html,
        title: collected.title ?? "",
        kind,
        collectionMethod: "fetch",
      });
      have.add(key);
    } catch (err) {
      console.warn(
        `Optional fetch failed for ${url}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  return { ...corpus, pages };
}

async function main() {
  const force = process.argv.includes("--force");
  const out = join(process.cwd(), "data", "fixtures", "zynava-discovery.csv");
  const retrievedAt = new Date().toISOString();

  console.log(`Crawling ${ZYNAVA_WEBSITE}…`);
  let corpus = await crawlWebsite(ZYNAVA_WEBSITE);
  corpus = await ensureExtraPages(corpus);
  console.log(
    `Corpus: ${corpus.pages.length} pages — ${corpus.pages
      .map((p) => `${p.kind}:${new URL(p.url).pathname}`)
      .join(", ")}`
  );

  const { dir: pagesDir, manifest } = persistCrawlPageSnapshots({
    companyId: "zynava.com",
    corpus,
    retrievedAt,
  });
  console.log(
    `Layer-1 snapshots: ${manifest.pageCount} pages → ${pagesDir} (schema CSV v${DISCOVERY_CSV_SCHEMA_VERSION})`
  );

  const signals = extractBrandSignals(corpus);
  const social = findSocialLinks(corpus);
  const catalogProducts = signals.catalogProducts;
  if (catalogProducts.length < 4) {
    throw new Error(
      `Expected ≥4 scrubbed catalog products from site; got ${catalogProducts.length}: ${catalogProducts
        .map((p) => p.name)
        .join(", ")}`
    );
  }

  const contentOpportunities = contentOpportunitiesForCatalog(catalogProducts);
  const base = loadZynavaFixture();

  const profile: BrandProfile = {
    ...base.brandProfile,
    businessName: base.brandProfile.businessName || "Zynava",
    website: ZYNAVA_WEBSITE,
    products: [...PLATFORM_PRODUCTS],
    catalogProducts,
    seoSummary: {
      ...base.brandProfile.seoSummary,
      contentOpportunities,
    },
    socialProfiles:
      social.some((s) => s.status === "present")
        ? social
        : base.brandProfile.socialProfiles,
  };

  const evidence = buildDiscoveryEvidence({
    corpus,
    signals: { ...signals, catalogProducts },
    social: profile.socialProfiles,
  });

  const cleanEvidence = evidence.filter((ev) => {
    if (ev.field !== "catalogProduct") return true;
    return !/\b(search|comparison|compare|builder|advisor|filter|engine|tool|explorer|finder|quiz|platform)\b/i.test(
      ev.value
    );
  });

  const gate = evaluateDiscoveryAcceptance({
    profile,
    evidence: cleanEvidence,
    corpus,
  });
  console.log("Acceptance gate:", JSON.stringify(gate, null, 2));

  if (!gate.accepted) {
    console.warn(
      "Gate failed — CSV will not be overwritten unless you fix diagnostics. Snapshots were still written."
    );
    if (!force) {
      process.exitCode = 2;
      return;
    }
    console.warn("--force set: writing CSV despite failed gate (explicit override).");
  }

  if (existsSync(out) && !force) {
    console.log(
      `Fixture exists at ${out}. Re-run with --force to overwrite (previous file will be copied to .bak).`
    );
    console.log(
      "Dry-run complete: catalogProducts:",
      catalogProducts.map((p) => p.name).join(", ")
    );
    return;
  }

  const crawlMeta = buildCrawlMeta(corpus);
  const notes =
    "Refreshed from public zynava.com crawl via refresh:zynava-fixture (discovery-csv-rows)";

  const csv = buildDiscoveryCsvDocument({
    profile,
    evidence: cleanEvidence,
    crawlMeta,
    strategyPreview: base.strategyPreview,
    sourceUrl: ZYNAVA_WEBSITE,
    notes,
  });

  if (existsSync(out)) {
    const bak = `${out}.bak-${retrievedAt.replace(/[:.]/g, "-")}`;
    copyFileSync(out, bak);
    console.log(`Backed up previous fixture → ${bak}`);
  }

  writeFileSync(out, csv, "utf8");
  const rowCount = csv.trim().split("\n").length - 1;
  console.log(`Wrote ${rowCount} rows → ${out}`);
  console.log(
    "catalogProducts:",
    catalogProducts.map((p) => `${p.name} <${p.sourceUrl}>`).join("; ")
  );
  console.log("contentOpportunities:", contentOpportunities.join(" | "));
  console.log("products[] (platform):", profile.products.join(", "));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

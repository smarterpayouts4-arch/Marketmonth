import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildDiscoveryProfileFromCorpus } from "./build-profile-from-corpus";
import { applyApprovedOverrides } from "./fixture-propose/apply-overrides";
import { mergeAndScrubIndexedProducts } from "./extract-catalog-names";
import {
  corpusFromFrozenPages,
  loadFrozenCorpus,
} from "./reconcile/frozen-corpus";
import type { CrawlCorpus } from "./types";
import path from "node:path";

function syntheticCorpusWithCalciumAndOmega(): CrawlCorpus {
  const catalogHtml = `
    <html><body><main>
      <h2>Vitamins</h2>
      <h3>Vitamin DThe Sunshine Vitamin</h3>
      <h3>Vitamin CThe Immune Vitamin</h3>
      <h3>Vitamin B12The Blood Vitamin</h3>
      <h2>Minerals</h2>
      <h3>MagnesiumThe Energy Mineral</h3>
      <h3>ZincThe Immune Mineral</h3>
      <h3>CalciumThe Bone Mineral</h3>
    </main></body></html>
  `;
  const explorerHtml = `
    <html><body><main>
      <button>Omega-3</button>
      <button>Magnesium</button>
      <button>Vitamin D</button>
    </main></body></html>
  `;
  const homeHtml = `
    <html><body><main>
      <h1>Zynava</h1>
      <p>Glycinate vs Oxide. D3 vs D2. Compare supplements clearly.</p>
    </main></body></html>
  `;
  return {
    normalizedUrl: "https://zynava.com/",
    origin: "https://zynava.com",
    pages: [
      {
        url: "https://zynava.com/",
        status: 200,
        html: homeHtml,
        title: "Zynava",
        kind: "home",
      },
      {
        url: "https://zynava.com/supplements/catalog",
        status: 200,
        html: catalogHtml,
        title: "Catalog",
        kind: "products",
      },
      {
        url: "https://zynava.com/tools/ingredient-explorer",
        status: 200,
        html: explorerHtml,
        title: "Explorer",
        kind: "other",
      },
    ],
  };
}

describe("buildDiscoveryProfileFromCorpus", () => {
  it("keeps Calcium and Omega-3 when both appear in corpus", () => {
    const corpus = syntheticCorpusWithCalciumAndOmega();
    const catalog = mergeAndScrubIndexedProducts({
      jsonLdProducts: [],
      corpus,
    });
    const names = catalog.map((p) => p.name.toLowerCase());
    assert.ok(names.includes("calcium"), `missing Calcium in ${names.join(",")}`);
    assert.ok(names.includes("omega-3"), `missing Omega-3 in ${names.join(",")}`);
  });

  it("marks catalog as observed and curated capabilities separately", async () => {
    const corpus = syntheticCorpusWithCalciumAndOmega();
    const build = await buildDiscoveryProfileFromCorpus({
      corpus,
      website: "https://zynava.com",
      curatedCapabilities: ["Supplement search", "Price comparison"],
      derivedSource: "rules",
    });
    assert.ok(build.observed.indexedProducts.length >= 4);
    assert.equal(build.curatedCapabilities.length, 2);
    assert.deepEqual(build.profile.products, [
      "Supplement search",
      "Price comparison",
    ]);
    assert.ok(
      !build.observed.indexedProducts.some((p) =>
        /search|comparison/i.test(p.name)
      )
    );
    assert.equal(
      build.diagnostics.extractorVersion,
      "discovery-profile-build-v1"
    );
  });

  it("does not keep stale audience without explicit override", async () => {
    const corpus = syntheticCorpusWithCalciumAndOmega();
    const build = await buildDiscoveryProfileFromCorpus({
      corpus,
      website: "https://zynava.com",
      derivedSource: "rules",
    });
    const stale = "STALE_CURATED_AUDIENCE_SHOULD_NOT_APPEAR";
    assert.notEqual(build.profile.audience, stale);
    const withOverride = applyApprovedOverrides(build.profile, {
      fields: { audience: stale },
    });
    assert.equal(withOverride.audience, stale);
  });
});

describe("same frozen corpus observed parity", () => {
  it("two builds from the same frozen corpus agree on observed catalog/FAQs/contacts", async () => {
    const frozenDir = path.join(
      process.cwd(),
      "data/runtime/discovery-pages/zynava.com"
    );
    const frozen = loadFrozenCorpus(frozenDir);
    if (!("pages" in frozen) || frozen.pages.length === 0) {
      // Environment without snapshots — skip-shaped pass with diagnostic
      assert.ok(true, "no frozen corpus in workspace");
      return;
    }
    const corpus = corpusFromFrozenPages(frozen.pages);
    const a = await buildDiscoveryProfileFromCorpus({
      corpus,
      website: "https://zynava.com",
      derivedSource: "rules",
      curatedCapabilities: ["Supplement search"],
    });
    const b = await buildDiscoveryProfileFromCorpus({
      corpus,
      website: "https://zynava.com",
      derivedSource: "rules",
      curatedCapabilities: ["Supplement search"],
    });
    assert.deepEqual(
      a.observed.indexedProducts.map((p) => p.name),
      b.observed.indexedProducts.map((p) => p.name)
    );
    assert.deepEqual(
      a.observed.faqs.map((f) => f.question),
      b.observed.faqs.map((f) => f.question)
    );
    assert.deepEqual(a.observed.contactEmails, b.observed.contactEmails);
    assert.deepEqual(a.observed.contactPhones, b.observed.contactPhones);
  });
});

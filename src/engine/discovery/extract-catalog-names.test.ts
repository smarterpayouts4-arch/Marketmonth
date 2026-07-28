import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cleanCatalogHeading,
  contentOpportunitiesForCatalog,
  isRejectedCatalogName,
  mergeAndScrubCatalogProducts,
  scrubCatalogProducts,
} from "./extract-catalog-names";
import type { CrawlCorpus } from "./types";

describe("extract-catalog-names", () => {
  it("rejects tool/advisor/builder phrasing", () => {
    assert.equal(isRejectedCatalogName("AI supplement advisor"), true);
    assert.equal(isRejectedCatalogName("Supplement plan builder"), true);
    assert.equal(isRejectedCatalogName("Supplement options explorer"), true);
    assert.equal(isRejectedCatalogName("Price comparison"), true);
    assert.equal(isRejectedCatalogName("Magnesium"), false);
    assert.equal(isRejectedCatalogName("Vitamin C"), false);
  });

  it("cleans glued catalog headings", () => {
    assert.equal(
      cleanCatalogHeading("Vitamin DThe Sunshine Vitamin"),
      "Vitamin D"
    );
    assert.equal(
      cleanCatalogHeading("Vitamin CThe Immune & Antioxidant Vitamin"),
      "Vitamin C"
    );
    assert.equal(
      cleanCatalogHeading("MagnesiumThe Energy Mineral"),
      "Magnesium"
    );
    assert.equal(cleanCatalogHeading("Vitamins"), null);
    assert.equal(cleanCatalogHeading("AI advisor (supplement questions)"), null);
  });

  it("mines catalog page vitamins/minerals and form-enriches from homepage", () => {
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
        <a>Supplement plan builder</a>
      </main></body></html>
    `;
    const homeHtml = `
      <html><body><main>
        <p>Not all ingredients are equal. Methylcobalamin vs Cyanocobalamin.
        D3 vs D2. Glycinate vs Oxide. The form matters.</p>
      </main></body></html>
    `;
    const corpus: CrawlCorpus = {
      normalizedUrl: "https://zynava.com/",
      origin: "https://zynava.com",
      pages: [
        {
          url: "https://zynava.com/",
          status: 200,
          html: homeHtml,
          title: "Home",
          kind: "home",
        },
        {
          url: "https://zynava.com/supplements/catalog",
          status: 200,
          html: catalogHtml,
          title: "Catalog",
          kind: "products",
        },
      ],
    };

    const catalog = mergeAndScrubCatalogProducts({
      jsonLdProducts: [
        { name: "AI supplement advisor", sourceUrl: "https://zynava.com/" },
      ],
      corpus,
      offerNames: ["Supplement search engine"],
      offerSourceUrl: "https://zynava.com/",
    });

    const names = catalog.map((p) => p.name);
    assert.ok(names.includes("Magnesium"));
    assert.ok(names.includes("Vitamin C"));
    assert.ok(names.includes("Vitamin B12"));
    assert.ok(names.includes("Zinc"));
    assert.ok(names.includes("Magnesium glycinate"));
    assert.ok(names.includes("Vitamin D3"));
    assert.ok(!names.some((n) => /advisor|builder|search|engine/i.test(n)));
    assert.ok(catalog.length <= 8);
    assert.ok(catalog.length >= 6);
  });

  it("scrubCatalogProducts drops platform nouns", () => {
    const scrubbed = scrubCatalogProducts([
      { name: "Omega-3", sourceUrl: "https://zynava.com/tools/ingredient-explorer" },
      { name: "Price comparison tool", sourceUrl: "https://zynava.com/" },
    ]);
    assert.deepEqual(
      scrubbed.map((p) => p.name),
      ["Omega-3"]
    );
  });

  it("builds ingredient-named content opportunities", () => {
    const topics = contentOpportunitiesForCatalog([
      { name: "Magnesium glycinate", sourceUrl: "https://zynava.com/" },
      { name: "Vitamin C", sourceUrl: "https://zynava.com/supplements/catalog" },
      { name: "Vitamin D3", sourceUrl: "https://zynava.com/" },
      { name: "Omega-3", sourceUrl: "https://zynava.com/tools/ingredient-explorer" },
      { name: "Zinc", sourceUrl: "https://zynava.com/supplements/catalog" },
      { name: "Vitamin B12", sourceUrl: "https://zynava.com/supplements/catalog" },
    ]);
    assert.ok(topics.length >= 4 && topics.length <= 6);
    assert.ok(topics.some((t) => /Magnesium glycinate/i.test(t)));
    assert.ok(topics.some((t) => /Vitamin C/i.test(t)));
    assert.ok(!topics.some((t) => /diagnose|treat|cure|disease/i.test(t)));
  });
});

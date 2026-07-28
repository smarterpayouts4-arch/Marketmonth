import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractCatalogProducts } from "./extract-product-jsonld";
import type { CrawlCorpus } from "./types";

describe("extractCatalogProducts", () => {
  it("reads Product JSON-LD names without treating them as junk text", () => {
    const html = `
      <html><body>
        <main><h1>Shop</h1></main>
        <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"Product","name":"Magnesium Glycinate 200mg","offers":{"@type":"Offer","price":"19.99","priceCurrency":"USD"}}
        </script>
      </body></html>
    `;
    const corpus: CrawlCorpus = {
      normalizedUrl: "https://shop.example",
      origin: "https://shop.example",
      pages: [
        {
          url: "https://shop.example/products",
          status: 200,
          html,
          title: "Products",
          kind: "products",
        },
      ],
    };
    const products = extractCatalogProducts(corpus);
    assert.equal(products.length, 1);
    assert.equal(products[0]!.name, "Magnesium Glycinate 200mg");
    assert.match(products[0]!.price ?? "", /19\.99/);
  });
});

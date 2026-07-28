import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractBrandSignals } from "./extract-brand";
import type { CrawlCorpus } from "./types";

describe("extractBrandSignals hygiene", () => {
  it("excludes JSON-LD script text from productText", () => {
    const html = `
      <html><body>
        <main>
          <h1>Pro Drill Kit</h1>
          <p>Durable kits for contractors.</p>
          <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"Product","name":"Pro Drill Kit"}
          </script>
        </main>
      </body></html>
    `;
    const corpus: CrawlCorpus = {
      normalizedUrl: "https://acme.example",
      origin: "https://acme.example",
      pages: [
        {
          url: "https://acme.example/products",
          status: 200,
          html,
          title: "Products",
          kind: "products",
        },
        {
          url: "https://acme.example/",
          status: 200,
          html: "<html><body><main><h1>Acme</h1></main></body></html>",
          title: "Acme",
          kind: "home",
        },
      ],
    };
    const result = extractBrandSignals(corpus);
    assert.doesNotMatch(result.productText, /@context/);
    assert.doesNotMatch(result.productText, /schema\.org/);
    assert.match(result.productText, /Durable kits|Pro Drill Kit/i);
  });
});

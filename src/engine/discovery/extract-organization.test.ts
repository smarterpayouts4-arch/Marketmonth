import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractOrganizationFacts } from "./extract-organization";
import type { CrawlCorpus } from "./types";

describe("extractOrganizationFacts", () => {
  it("parses Organization JSON-LD into business facts", () => {
    const html = `
      <html><body>
        <script type="application/ld+json">
        {
          "@context":"https://schema.org",
          "@type":"Organization",
          "name":"ZYNAVA",
          "legalName":"DR.B WELLNESS & CARE LLC",
          "email":"business@zynava.com",
          "telephone":"(561) 583-1280",
          "foundingDate":"2025",
          "founder":{"@type":"Person","name":"Dr. B"},
          "address":{
            "@type":"PostalAddress",
            "streetAddress":"15257 Amberly Dr, Ste 233",
            "addressLocality":"Tampa",
            "addressRegion":"FL",
            "postalCode":"33647",
            "addressCountry":"US"
          },
          "areaServed":{"@type":"Country","name":"United States"},
          "knowsAbout":["Dietary Supplements","Supplement Price Comparison"],
          "sameAs":["https://www.facebook.com/zynava"],
          "hasOfferCatalog":{
            "@type":"OfferCatalog",
            "itemListElement":[
              {"@type":"Offer","itemOffered":{"@type":"Service","name":"Supplement plan builder"}}
            ]
          }
        }
        </script>
        <main><p>Visible copy</p></main>
      </body></html>
    `;
    const corpus: CrawlCorpus = {
      normalizedUrl: "https://zynava.com",
      origin: "https://zynava.com",
      pages: [
        {
          url: "https://zynava.com/",
          status: 200,
          html,
          title: "Zynava",
          kind: "home",
        },
      ],
    };
    const org = extractOrganizationFacts(corpus);
    assert.ok(org);
    assert.equal(org!.legalName, "DR.B WELLNESS & CARE LLC");
    assert.equal(org!.telephone, "(561) 583-1280");
    assert.equal(org!.founder, "Dr. B");
    assert.equal(org!.city, "Tampa");
    assert.ok(org!.knowsAbout.includes("Dietary Supplements"));
    assert.ok(org!.offerNames.includes("Supplement plan builder"));
  });
});

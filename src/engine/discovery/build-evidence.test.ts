import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildDiscoveryEvidence } from "./build-evidence";
import type { BrandSignals, CrawlCorpus } from "./types";

function baseSignals(overrides: Partial<BrandSignals> = {}): BrandSignals {
  return {
    title: "Zynava",
    metaDescription: "Compare supplement prices",
    headings: ["Compare Supplement Prices"],
    colors: [],
    logoUrl: "https://zynava.com/logo.png",
    contactEmails: ["support@zynava.com"],
    contactPhones: ["(561) 583-1280"],
    aboutText: "AI-powered supplement search",
    productText: "Supplement search",
    faqText: "",
    faqs: [
      {
        question: "Is Zynava free?",
        answer: "Yes, no sign-up required.",
        sourceUrl: "https://zynava.com/faq",
      },
    ],
    catalogProducts: [
      { name: "Supplement plan builder", sourceUrl: "https://zynava.com/" },
    ],
    organization: {
      legalName: "DR.B WELLNESS & CARE LLC",
      founder: "Dr. B",
      foundingDate: "2025",
      city: "Tampa",
      region: "FL",
      country: "US",
      areaServed: "United States",
      knowsAbout: ["Dietary Supplements"],
      sameAs: [],
      offerNames: [],
      sourceUrl: "https://zynava.com/",
    },
    bodySample: "Filter your way",
    testimonialText: "",
    blogText: "",
    ctaTexts: ["Start Saving"],
    locationHints: [],
    ...overrides,
  };
}

describe("buildDiscoveryEvidence enrichment", () => {
  it("persists contact, FAQ, catalog, and organization fields", () => {
    const corpus: CrawlCorpus = {
      normalizedUrl: "https://zynava.com",
      origin: "https://zynava.com",
      pages: [
        {
          url: "https://zynava.com/",
          status: 200,
          html: "<html><body><main><h1>Zynava</h1><a href='#'>Start Saving</a></main></body></html>",
          title: "Zynava",
          kind: "home",
        },
      ],
    };
    const evidence = buildDiscoveryEvidence({
      corpus,
      signals: baseSignals(),
      social: [
        {
          platform: "facebook",
          status: "present",
          url: "https://www.facebook.com/zynava",
        },
      ],
    });
    const fields = evidence.map((e) => e.field);
    assert.ok(fields.includes("contactEmail"));
    assert.ok(fields.includes("contactPhone"));
    assert.ok(fields.includes("logoUrl"));
    assert.ok(fields.includes("faq"));
    assert.ok(fields.includes("catalogProduct"));
    assert.ok(fields.includes("legalName"));
    assert.ok(fields.includes("founder"));
    assert.ok(fields.includes("knowsAbout"));
    assert.ok(fields.includes("social.facebook"));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { evaluateDiscoveryAcceptance } from "./acceptance-gate";
import type { BrandProfile } from "./brand-profile";
import type { CrawlCorpus } from "./types";

function minimalProfile(over: Partial<BrandProfile> = {}): BrandProfile {
  return {
    businessName: "Zynava",
    website: "https://zynava.com",
    description: "Supplement search",
    audience: "People comparing supplement labels",
    products: ["Supplement search"],
    services: [],
    catalogProducts: [{ name: "Magnesium glycinate", sourceUrl: "https://zynava.com/" }],
    valueProposition: "Compare prices",
    brandVoice: "Clear",
    marketingOpportunity: "Label education",
    colors: [],
    socialProfiles: [],
    competitors: [],
    seoSummary: {
      metadataCompleteness: "partial",
      pageSpeedNote: "",
      technicalObservations: [],
      contentOpportunities: [],
    },
    ...over,
  } as BrandProfile;
}

describe("evaluateDiscoveryAcceptance", () => {
  it("accepts a multi-purpose corpus with catalog + FAQ evidence", () => {
    const corpus: CrawlCorpus = {
      normalizedUrl: "https://zynava.com",
      origin: "https://zynava.com",
      pages: [
        {
          url: "https://zynava.com/",
          status: 200,
          html: "<html></html>",
          title: "Home",
          kind: "home",
          collectionMethod: "fetch",
        },
        {
          url: "https://zynava.com/about",
          status: 200,
          html: "<html></html>",
          title: "About",
          kind: "about",
          collectionMethod: "fetch",
        },
        {
          url: "https://zynava.com/faq",
          status: 200,
          html: "<html></html>",
          title: "FAQ",
          kind: "faq",
          collectionMethod: "fetch",
        },
        {
          url: "https://zynava.com/supplements/catalog",
          status: 200,
          html: "<html></html>",
          title: "Catalog",
          kind: "products",
          collectionMethod: "fetch",
        },
      ],
    };
    const report = evaluateDiscoveryAcceptance({
      profile: minimalProfile(),
      evidence: [
        {
          id: "1",
          field: "faq",
          kind: "observed",
          value: "Q: Does ZYNAVA sell supplements? A: No.",
          sourceUrl: "https://zynava.com/faq",
          confidence: "high",
        },
      ],
      corpus,
    });
    assert.equal(report.accepted, true);
    assert.ok(report.pageCoverage >= 0.4);
  });

  it("rejects homepage-only generic audience profiles", () => {
    const corpus: CrawlCorpus = {
      normalizedUrl: "https://example.com",
      origin: "https://example.com",
      pages: [
        {
          url: "https://example.com/",
          status: 200,
          html: "<html></html>",
          title: "Home",
          kind: "home",
          collectionMethod: "fetch",
        },
      ],
    };
    const report = evaluateDiscoveryAcceptance({
      profile: minimalProfile({
        audience: "Decision-makers evaluating clearer marketing systems",
        catalogProducts: [],
        products: [],
        services: [],
      }),
      evidence: [],
      corpus,
    });
    assert.equal(report.accepted, false);
    assert.ok(report.diagnostics.length >= 1);
  });
});

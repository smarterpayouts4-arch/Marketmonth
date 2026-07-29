import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { evaluateDiscoveryAcceptance } from "./acceptance-gate";
import type { BrandProfile } from "./brand-profile";
import type { CrawlCorpus } from "./types";

function profile(over: Partial<BrandProfile> = {}): BrandProfile {
  return {
    businessName: "Zynava",
    website: "https://zynava.com",
    description:
      "ZYNAVA helps people compare supplements with clear price-per-serving.",
    audience:
      "People who feel confused by the supplement market and want clearer comparisons.",
    products: ["Supplement search"],
    services: ["Multi-retailer price comparison"],
    indexedProducts: [
      { name: "Calcium", sourceUrl: "https://zynava.com/calcium" },
      { name: "Omega-3", sourceUrl: "https://zynava.com/omega-3" },
      { name: "Creatine", sourceUrl: "https://zynava.com/creatine" },
    ],
    valueProposition:
      "Compare supplements across retailers with transparent pricing.",
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

const richCorpus: CrawlCorpus = {
  normalizedUrl: "https://zynava.com",
  origin: "https://zynava.com",
  pages: ["home", "about", "faq", "products"].map((kind) => ({
    url: `https://zynava.com/${kind}`,
    status: 200,
    html: "<html></html>",
    title: kind,
    kind: kind as CrawlCorpus["pages"][0]["kind"],
    collectionMethod: "fetch" as const,
  })),
};

describe("acceptance gate quality", () => {
  it("rejects chrome description and generic audience", () => {
    const report = evaluateDiscoveryAcceptance({
      profile: profile({
        description: "How It WorksContactMore about us",
        audience: "Customers researching solutions in this category",
      }),
      evidence: [
        {
          id: "1",
          field: "faq",
          kind: "observed",
          value: "Q: Does ZYNAVA sell supplements? A: No.",
          confidence: "high",
        },
      ],
      corpus: richCorpus,
    });
    assert.equal(report.accepted, false);
    assert.equal(report.approvalReady, false);
    assert.ok(report.failures.includes("description_chrome"));
    assert.ok(report.failures.includes("generic_audience"));
  });

  it("marks cleaned evidence-grounded profile approval_ready", () => {
    const report = evaluateDiscoveryAcceptance({
      profile: profile(),
      evidence: [
        {
          id: "1",
          field: "faq",
          kind: "observed",
          value: "Q: Does ZYNAVA sell supplements? A: No — we help compare.",
          sourceUrl: "https://zynava.com/faq",
          confidence: "high",
        },
        {
          id: "2",
          field: "faq",
          kind: "observed",
          value: "Q: What is ZYNAVA? A: A discovery platform.",
          sourceUrl: "https://zynava.com/faq",
          confidence: "high",
        },
        {
          id: "3",
          field: "faq",
          kind: "observed",
          value: "Q: Who is it for? A: Confused supplement shoppers.",
          sourceUrl: "https://zynava.com/faq",
          confidence: "high",
        },
      ],
      corpus: richCorpus,
    });
    assert.equal(report.accepted, true);
    assert.equal(report.approvalReady, true);
    assert.equal(report.status, "approval_ready");
  });
});

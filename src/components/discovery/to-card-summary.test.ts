import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toCardSummary } from "./to-card-summary";
import type { BrandProfileView } from "./types";

function baseProfile(overrides: Partial<BrandProfileView> = {}): BrandProfileView {
  return {
    businessName: "Acme Dental",
    website: "https://acme.example",
    description: "Family dentistry with clear pricing.",
    valueProposition: "Gentle care, transparent offers.",
    audience: "Busy parents who want clear pricing",
    products: ["Whitening"],
    services: ["Cleanings"],
    brandVoice: "Warm",
    colors: ["#112233"],
    competitors: [
      { name: "Rival", reason: "Similar local practice", website: "https://rival.example" },
    ],
    socialProfiles: [
      {
        platform: "instagram",
        status: "present",
        url: "https://instagram.com/acme",
      },
    ],
    seoSummary: {
      metadataCompleteness: "partial",
      pageSpeedNote: "ok",
      technicalObservations: [],
      contentOpportunities: ["FAQ content"],
    },
    marketingOpportunity: "Educate on pricing transparency.",
    ...overrides,
  };
}

describe("toCardSummary (discovery UI transform)", () => {
  it("maps success profile into card summary fields", () => {
    const summary = toCardSummary(baseProfile());
    assert.equal(summary.businessName, "Acme Dental");
    assert.ok(summary.business.length > 0);
    assert.ok(Array.isArray(summary.activeChannels));
    assert.ok(summary.activeChannels.includes("Instagram"));
  });

  it("sentence-truncates exceptional copy instead of crashing", () => {
    const huge =
      "First complete sentence about the business. ".repeat(40) +
      "Trailing fragment without end";
    const summary = toCardSummary(
      baseProfile({
        description: huge,
        valueProposition: huge,
        marketingOpportunity: huge,
      })
    );
    assert.ok(summary.business.length <= 481);
    assert.ok(summary.growthOpportunity.length <= 481);
    assert.equal(summary.overflow.businessOverview, true);
    assert.ok(summary.full.business.length > summary.business.length);
    assert.ok(!/\w\.\.\.$/.test(summary.business.replace(/…$/, "")));
  });

  it("keeps ordinary descriptions intact for in-card scrolling", () => {
    const description =
      "AI-powered supplement search and price-comparison engine. Choose your ingredient, form, diet, and budget, Zynava finds matching products across participating retailers.";
    const summary = toCardSummary(baseProfile({ description }));
    assert.equal(summary.business, description);
    assert.equal(summary.overflow.businessOverview, false);
  });

  it("handles missing optional collections without throwing", () => {
    const summary = toCardSummary(
      baseProfile({
        products: [],
        services: [],
        competitors: [],
        socialProfiles: [],
      })
    );
    assert.ok(summary);
  });
});

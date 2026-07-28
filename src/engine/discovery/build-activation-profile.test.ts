import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildDiscoveryActivationProfile } from "./build-activation-profile";
import type { BrandProfile } from "./brand-profile";

function profile(overrides: Partial<BrandProfile> = {}): BrandProfile {
  return {
    businessName: "Acme Tools",
    website: "https://acme-tools.example",
    description:
      "Acme Tools helps contractors compare durable drill kits before they buy.",
    audience: "Contractors choosing jobsite tools under time pressure",
    products: ["Pro Drill Kit", "Jobsite Case"],
    services: ["Fleet Tool Planning"],
    catalogProducts: [],
    valueProposition:
      "Compare kit durability and fit so crews stop guessing on the jobsite.",
    brandVoice: "Direct and practical",
    marketingOpportunity:
      "Own the which-kit-for-this-job decision with clear comparisons.",
    colors: ["#111111"],
    socialProfiles: [],
    seoSummary: {
      metadataCompleteness: "partial",
      pageSpeedNote: "ok",
      technicalObservations: [],
      contentOpportunities: [
        "Explain how kit choice changes by job type",
      ],
    },
    competitors: [
      { name: "Tool peers", reason: "Suggested from category keywords" },
    ],
    ...overrides,
  };
}

describe("buildDiscoveryActivationProfile", () => {
  it("derives different buyer tensions for unrelated businesses", () => {
    const tools = buildDiscoveryActivationProfile({
      brandProfile: profile(),
      offerHints: ["Pro Drill Kit", "Fleet Tool Planning"],
      faqs: [
        {
          question: "Which kit fits concrete jobs?",
          answer: "Choose the higher-torque kit for masonry.",
          sourceUrl: "https://acme-tools.example/faq",
        },
      ],
    });

    const bakery = buildDiscoveryActivationProfile({
      brandProfile: profile({
        businessName: "Harbor Bakery",
        website: "https://harbor-bakery.example",
        description: "Neighborhood bakery for weekend pastry pickup.",
        audience: "Families planning weekend brunch",
        products: ["Croissant Box", "Birthday Cake"],
        services: ["Catering Platters"],
        valueProposition: "Fresh pastry pickup without the morning rush.",
        marketingOpportunity:
          "Own the weekend brunch pastry decision with clear pickup guidance.",
        seoSummary: {
          metadataCompleteness: "weak",
          pageSpeedNote: "ok",
          technicalObservations: [],
          contentOpportunities: ["Share pickup timing for busy mornings"],
        },
      }),
      offerHints: ["Croissant Box", "Catering Platters"],
      faqs: [
        {
          question: "When should I order for Sunday brunch?",
          answer: "Order by Friday noon for weekend pickup.",
        },
      ],
    });

    const toolLabels = tools.buyerTensions.map((t) => t.label).join(" ");
    const bakeryLabels = bakery.buyerTensions.map((t) => t.label).join(" ");
    assert.notEqual(toolLabels, bakeryLabels);
    assert.match(toolLabels, /kit|contractor|concrete|option/i);
    assert.match(bakeryLabels, /brunch|Sunday|Families|option|situation|cost/i);
  });

  it("limits lead offers to detected website offerings", () => {
    const offers = ["Pro Drill Kit", "Fleet Tool Planning"];
    const activation = buildDiscoveryActivationProfile({
      brandProfile: profile(),
      offerHints: offers,
    });
    for (const opt of activation.leadOffers) {
      assert.ok(offers.includes(opt.label), opt.label);
      assert.ok(opt.evidence.length > 0);
    }
  });

  it("does not invent industry language absent from the site", () => {
    const activation = buildDiscoveryActivationProfile({
      brandProfile: profile({
        description: "B2B scheduling software for clinics.",
        audience: "Clinic managers coordinating appointments",
        products: ["Schedule Board"],
        services: ["Onboarding Support"],
        valueProposition: "Keep appointment boards clear across locations.",
        marketingOpportunity: "Own the multi-location schedule clarity story.",
      }),
      offerHints: ["Schedule Board"],
    });
    const blob = JSON.stringify(activation).toLowerCase();
    assert.equal(blob.includes("supplement"), false);
    assert.equal(blob.includes("dietary"), false);
    assert.equal(blob.includes("ingredient"), false);
  });

  it("marks low-evidence sites honestly and avoids channel growth tips", () => {
    const activation = buildDiscoveryActivationProfile({
      brandProfile: profile({
        description: "We sell things.",
        audience: "",
        products: [],
        services: [],
        valueProposition: "",
        marketingOpportunity: "Expand to TikTok.",
        seoSummary: {
          metadataCompleteness: "weak",
          pageSpeedNote: "ok",
          technicalObservations: [],
          contentOpportunities: ["Post more on Instagram"],
        },
      }),
      offerHints: [],
    });
    assert.equal(activation.evidenceQuality, "low");
    assert.equal(activation.brandCore.confidence, "low");
    assert.ok(activation.brandCore.clarification);
    for (const g of activation.growthDirections) {
      assert.doesNotMatch(g.label, /tiktok|instagram/i);
      assert.doesNotMatch(g.explanation, /tiktok|instagram/i);
    }
  });

  it("attaches evidence to every recommendation", () => {
    const activation = buildDiscoveryActivationProfile({
      brandProfile: profile(),
      offerHints: ["Pro Drill Kit"],
    });
    for (const opt of [
      ...activation.buyerTensions,
      ...activation.leadOffers,
      ...activation.growthDirections,
    ]) {
      assert.ok(opt.evidence.length > 0, opt.id);
    }
  });
});

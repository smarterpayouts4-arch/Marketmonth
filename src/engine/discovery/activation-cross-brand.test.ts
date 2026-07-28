import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildDiscoveryActivationProfile } from "./build-activation-profile";
import type { BrandProfile } from "./brand-profile";

function base(
  overrides: Partial<BrandProfile> & { businessName: string }
): BrandProfile {
  return {
    website: `https://${overrides.businessName.toLowerCase().replace(/\s+/g, "")}.example`,
    description: overrides.description ?? "A useful product for customers.",
    audience: overrides.audience ?? "People evaluating options",
    products: overrides.products ?? ["Core Product"],
    services: overrides.services ?? [],
    catalogProducts: overrides.catalogProducts ?? [],
    valueProposition:
      overrides.valueProposition ?? "Help customers decide with clarity.",
    brandVoice: "Clear",
    marketingOpportunity:
      overrides.marketingOpportunity ??
      "Own the decision moment with clear comparisons.",
    colors: ["#111111"],
    socialProfiles: [],
    seoSummary: {
      metadataCompleteness: "partial",
      pageSpeedNote: "ok",
      technicalObservations: [],
      contentOpportunities: overrides.seoSummary?.contentOpportunities ?? [
        "Explain how choices differ by situation",
      ],
      ...overrides.seoSummary,
    },
    competitors: [],
    ...overrides,
  };
}

const FIXTURES: Array<{
  type: string;
  profile: BrandProfile;
  offers: string[];
  expectSupplement?: boolean;
  thin?: boolean;
}> = [
  {
    type: "saas",
    profile: base({
      businessName: "ScheduleBoard",
      description:
        "ScheduleBoard helps clinic managers keep multi-location appointment boards clear.",
      audience: "Clinic managers coordinating appointments",
      products: ["Schedule Board"],
      services: ["Onboarding Support"],
      valueProposition:
        "Keep appointment boards clear across locations without spreadsheet chaos.",
      marketingOpportunity:
        "Own the multi-location schedule clarity story for clinics.",
    }),
    offers: ["Schedule Board", "Onboarding Support"],
  },
  {
    type: "local-service",
    profile: base({
      businessName: "Harbor Plumbing",
      description: "Same-day plumbing repair for homeowners in Portland.",
      audience: "Homeowners with urgent leaks",
      products: [],
      services: ["Emergency Leak Repair", "Water Heater Install"],
      valueProposition: "Stop the leak today with a clear flat-rate visit.",
      marketingOpportunity:
        "Own the same-day leak decision for Portland homeowners.",
    }),
    offers: ["Emergency Leak Repair", "Water Heater Install"],
  },
  {
    type: "consultancy",
    profile: base({
      businessName: "Northstar Advisors",
      description: "Strategy consulting for mid-market operators.",
      audience: "Operators planning a turnaround",
      products: [],
      services: ["90-Day Operating Review"],
      valueProposition:
        "A focused operating review that clarifies the next 90 days.",
      marketingOpportunity: "Own the 90-day operating clarity conversation.",
    }),
    offers: ["90-Day Operating Review"],
  },
  {
    type: "ecommerce",
    profile: base({
      businessName: "Trail Gear Co",
      description: "Outdoor packs and shells shipped nationwide.",
      audience: "Weekend hikers upgrading gear",
      products: ["Alpine Daypack", "Storm Shell"],
      services: [],
      valueProposition: "Packs and shells sized for real weekend trails.",
      marketingOpportunity: "Own weekend trail readiness comparisons.",
    }),
    offers: ["Alpine Daypack", "Storm Shell"],
  },
  {
    type: "healthcare-related",
    profile: base({
      businessName: "ClearPath PT",
      description: "Physical therapy for desk workers with back pain.",
      audience: "Desk workers with recurring back pain",
      products: [],
      services: ["Initial Assessment", "Recovery Plan"],
      valueProposition: "A recovery plan built around desk posture and strength.",
      marketingOpportunity: "Own the desk-back recovery decision.",
    }),
    offers: ["Initial Assessment", "Recovery Plan"],
  },
  {
    type: "creator",
    profile: base({
      businessName: "Maya Lens",
      description: "Photography courses for creators building a portfolio.",
      audience: "Creators learning portrait lighting",
      products: ["Lighting Foundations Course"],
      services: ["Portfolio Critique"],
      valueProposition: "Learn portrait lighting without expensive gear first.",
      marketingOpportunity: "Own beginner lighting confidence for creators.",
    }),
    offers: ["Lighting Foundations Course", "Portfolio Critique"],
  },
  {
    type: "marketplace",
    profile: base({
      businessName: "LocalList",
      description: "A directory connecting renters with verified local cleaners.",
      audience: "Renters hiring a cleaner for the first time",
      products: ["Cleaner Directory"],
      services: ["Verified Pro Badges"],
      valueProposition: "Compare verified cleaners before you book.",
      marketingOpportunity: "Own first-time cleaner comparison for renters.",
    }),
    offers: ["Cleaner Directory", "Verified Pro Badges"],
  },
  {
    type: "image-heavy",
    profile: base({
      businessName: "Studio North",
      description: "Interior design studio showcasing residential projects.",
      audience: "Homeowners planning a living room refresh",
      products: [],
      services: ["Design Retainer"],
      valueProposition: "A living room plan you can approve before build-out.",
      marketingOpportunity: "Own the living-room refresh decision.",
      seoSummary: {
        metadataCompleteness: "weak",
        pageSpeedNote: "image heavy",
        technicalObservations: ["Many hero images"],
        contentOpportunities: ["Show before-and-after living room choices"],
      },
    }),
    offers: ["Design Retainer"],
  },
  {
    type: "thin-one-pager",
    profile: base({
      businessName: "QuickFix",
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
    offers: [],
    thin: true,
  },
  {
    type: "multi-unrelated-offers",
    profile: base({
      businessName: "Riverworks",
      description:
        "Riverworks runs catering, boat rentals, and event staffing under one brand.",
      audience: "Planners juggling food, boats, and staff for lakeside events",
      products: ["Boat Day Rental"],
      services: ["Lakeside Catering", "Event Staffing"],
      valueProposition:
        "One team for food, boats, and staff at lakeside events.",
      marketingOpportunity:
        "Own the lakeside event coordination decision for planners.",
    }),
    offers: ["Lakeside Catering", "Boat Day Rental", "Event Staffing"],
  },
  {
    type: "supplement-control",
    profile: base({
      businessName: "Zynava",
      description:
        "Zynava is an AI-powered supplement search and price-comparison engine.",
      audience: "Shoppers comparing supplements before buying",
      products: ["Supplement search", "Price comparison"],
      services: ["Educational comparison guidance"],
      valueProposition:
        "Compare supplement prices and formulations without overwhelm.",
      marketingOpportunity:
        "Help shoppers compare supplement prices, ingredients, and brands.",
    }),
    offers: ["Supplement search", "Price comparison"],
    expectSupplement: true,
  },
];

describe("activation cross-brand fixtures", () => {
  for (const fixture of FIXTURES) {
    it(`${fixture.type}: hygiene, grounding, no industry bleed`, () => {
      const activation = buildDiscoveryActivationProfile({
        brandProfile: fixture.profile,
        offerHints: fixture.offers,
      });
      const blob = JSON.stringify(activation);

      assert.doesNotMatch(blob, /@context|schema\.org|application\/ld/i);
      assert.ok(activation.brandCore.insight.trim().length > 0);

      if (fixture.thin) {
        assert.equal(activation.evidenceQuality, "low");
        assert.ok(activation.brandCore.clarification);
        for (const g of activation.growthDirections) {
          assert.doesNotMatch(g.label, /tiktok|instagram/i);
          assert.doesNotMatch(g.explanation, /tiktok|instagram/i);
        }
      } else {
        assert.ok(
          activation.brandCore.confidence !== "low" ||
            Boolean(activation.brandCore.clarification)
        );
      }

      for (const offer of activation.leadOffers) {
        assert.ok(
          fixture.offers.includes(offer.label),
          `${fixture.type} unexpected offer ${offer.label}`
        );
        assert.ok(offer.evidence.length > 0);
      }

      for (const g of activation.growthDirections) {
        assert.doesNotMatch(g.label, /tiktok|instagram|expand to/i);
      }

      if (!fixture.expectSupplement) {
        assert.doesNotMatch(blob.toLowerCase(), /\bsupplement/);
        assert.doesNotMatch(blob.toLowerCase(), /\bdietary\b/);
      } else {
        assert.match(blob.toLowerCase(), /supplement/);
      }

      // Buyer moments should not invent unrelated industry when absent
      if (!fixture.expectSupplement && !fixture.thin) {
        for (const t of activation.buyerTensions) {
          assert.doesNotMatch(t.label.toLowerCase(), /supplement|dietary/);
        }
      }

      // No doubled brand construction
      const name = fixture.profile.businessName.toLowerCase();
      assert.doesNotMatch(
        activation.brandCore.insight.toLowerCase(),
        new RegExp(`${name}\\s+centers\\s+on\\s+${name}`)
      );
    });
  }
});

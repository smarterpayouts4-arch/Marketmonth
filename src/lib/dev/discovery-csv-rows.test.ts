import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { BrandProfile } from "@/engine/discovery/brand-profile";

import { buildDiscoveryCsvDocument } from "./discovery-csv-rows";

const profile: BrandProfile = {
  businessName: "Zynava",
  website: "https://zynava.com",
  description: "AI supplement search",
  audience: "Supplement shoppers",
  products: ["Supplement search"],
  services: ["Price comparison"],
  catalogProducts: [],
  valueProposition: "Compare with clarity",
  brandVoice: "Clear",
  marketingOpportunity: "Help shoppers compare",
  colors: ["#31695A"],
  socialProfiles: [
    {
      platform: "facebook",
      status: "present",
      url: "https://www.facebook.com/zynava",
    },
  ],
  seoSummary: {
    metadataCompleteness: "strong",
    pageSpeedNote: "ok",
    technicalObservations: [],
    contentOpportunities: ["How to compare labels"],
  },
  competitors: [
    {
      name: "category peers",
      reason: "On-site language",
    },
  ],
};

describe("buildDiscoveryCsvDocument", () => {
  it("exports social, competitors, and evidence rows", () => {
    const csv = buildDiscoveryCsvDocument({
      profile,
      evidence: [
        {
          id: "e1",
          field: "contactEmail",
          kind: "observed",
          value: "support@zynava.com",
          sourceUrl: "https://zynava.com",
          confidence: "high",
        },
      ],
      crawlMeta: {
        pageCount: 1,
        kinds: ["home"],
        detectedLocations: [
          {
            city: "Tampa",
            region: "FL",
            country: "US",
            sourceUrl: "https://zynava.com",
            confidence: "high",
          },
        ],
      },
      sourceUrl: "https://zynava.com",
      retrievedAt: "2026-07-27T00:00:00.000Z",
    });
    assert.match(csv, /socialProfiles/);
    assert.match(csv, /competitors/);
    assert.match(csv, /catalogProducts/);
    assert.match(csv, /record_type,field,value/);
    assert.match(csv, /"evidence","contactEmail"/);
    assert.match(csv, /"location","detectedLocation"/);
    assert.match(csv, /facebook\.com\/zynava/);
  });
});

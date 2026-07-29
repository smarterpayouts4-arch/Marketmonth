import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CompanyProfileProjection } from "@/lib/company-profile/projection.schema";

import { buildPlatformAdaptations, detectChannels } from "./platform-mapping";
import type { BrandSignalGraph } from "./types";

const emptyGraph = {
  businessIdentity: [],
  customerProblem: [],
  valueMechanism: [],
  trustSignals: [],
  offerInventory: [],
  contentInventory: [],
  socialFootprint: [],
  conversionPaths: [],
} satisfies BrandSignalGraph;

function baseProjection(
  socialProfiles: CompanyProfileProjection["socialProfiles"]
): CompanyProfileProjection {
  return {
    schemaVersion: "2.0",
    companyId: "example.com",
    businessName: "Example",
    website: "https://example.com",
    products: [],
    services: [],
    indexedProducts: [],
    colors: [],
    socialProfiles,
    competitors: [],
    contentOpportunities: [],
    derivedFieldNames: [],
    faqs: [],
    offers: [],
    evidence: [],
    signals: {
      title: "",
      metaDescription: "",
      headings: [],
      ctaTexts: [],
      productText: "",
      aboutText: "",
      bodySample: "",
      testimonialText: "",
      colors: [],
      contactEmails: [],
      contactPhones: [],
      locationHints: [],
    },
    crawlMeta: {
      failedUrls: [],
      pageKinds: [],
      collectionMethods: [],
      detectedLocations: [],
    },
    artifactHash: "test",
  };
}

describe("platform-mapping", () => {
  it("uses link-detected / link-not-detected wording only", () => {
    const channels = detectChannels(
      baseProjection([
        {
          platform: "facebook",
          status: "present",
          url: "https://facebook.com/example",
        },
      ])
    );
    assert.ok(channels.every((c) => c.status === "link-detected" || c.status === "link-not-detected"));
    assert.equal(
      channels.find((c) => c.platform === "facebook")?.status,
      "link-detected"
    );
    assert.equal(
      channels.find((c) => c.platform === "tiktok")?.status,
      "link-not-detected"
    );

    const adaptations = buildPlatformAdaptations(channels, emptyGraph);
    const blob = adaptations.map((a) => a.guidance).join(" ");
    assert.ok(!/\b(no account|not active|unused|missing)\b/i.test(blob));
    assert.ok(/link (not )?detected/i.test(blob) || adaptations.length > 0);
  });
});

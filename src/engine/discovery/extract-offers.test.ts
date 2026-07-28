import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { collectOfferHints, isJunkOfferFragment } from "./extract-offers";
import type { BrandSignals } from "./types";

function signals(overrides: Partial<BrandSignals> = {}): BrandSignals {
  return {
    title: "Acme",
    metaDescription: "",
    headings: ["Pro Drill Kit"],
    colors: [],
    contactEmails: [],
    contactPhones: [],
    aboutText: "",
    productText: "",
    faqText: "",
    faqs: [],
    catalogProducts: [],
    organization: null,
    bodySample: "",
    testimonialText: "",
    blogText: "",
    ctaTexts: [],
    locationHints: [],
    ...overrides,
  };
}

describe("extract-offers hygiene", () => {
  it("rejects JSON-LD and schema fragments", () => {
    assert.equal(isJunkOfferFragment('{"@context":"https://schema'), true);
    assert.equal(isJunkOfferFragment('[{"@context":"https://schema.org"'), true);
    assert.equal(isJunkOfferFragment("https://example.com/product"), true);
    assert.equal(isJunkOfferFragment("Pro Drill Kit"), false);
  });

  it("does not surface JSON crumbs from polluted productText", () => {
    const hints = collectOfferHints(
      signals({
        productText:
          'Buy our kit. [{"@context":"https://schema.org","@type":"Product","name":"X"}]. More copy here.',
        headings: [],
      }),
      { products: ["Pro Drill Kit"], services: [] }
    );
    assert.ok(hints.includes("Pro Drill Kit"));
    for (const h of hints) {
      assert.equal(isJunkOfferFragment(h), false, h);
      assert.doesNotMatch(h, /@context|schema\.org/i);
    }
  });
});

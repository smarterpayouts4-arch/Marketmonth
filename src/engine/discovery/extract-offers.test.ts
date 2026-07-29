import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  collectOfferHints,
  isCommercialTerm,
  isJunkOfferFragment,
  isPageLevelSourceUrl,
} from "./extract-offers";
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
    indexedProducts: [],
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
          'Free shipping on every order. [{"@context":"https://schema.org","@type":"Product","name":"X"}]. More copy here.',
        headings: [],
      }),
      {
        website: "https://example.com",
        products: ["Pro Drill Kit"],
        services: [],
        indexedProducts: [],
      }
    );
    for (const h of hints) {
      assert.equal(isJunkOfferFragment(h.label), false, h.label);
      assert.doesNotMatch(h.label, /@context|schema\.org/i);
    }
  });

  it("treats product and service names as products, never offers", () => {
    const hints = collectOfferHints(
      signals({ headings: [], productText: "", ctaTexts: [] }),
      {
        website: "https://example.com",
        products: ["Pro Drill Kit"],
        services: ["Camera drain inspection"],
        indexedProducts: [],
      }
    );
    assert.deepEqual(hints, []);
  });

  it("never returns an indexed product name as an offer", () => {
    const hints = collectOfferHints(
      signals({
        headings: ["Vitamin D3 Softgels", "Free shipping over $35"],
        indexedProducts: [
          {
            name: "Vitamin D3 Softgels",
            sourceUrl: "https://example.com/catalog/vitamin-d3",
          },
        ],
      })
    );
    const labels = hints.map((h) => h.label.toLowerCase());
    assert.ok(
      !labels.includes("vitamin d3 softgels"),
      "catalog name leaked into offers"
    );
    assert.ok(hints.some((h) => /free shipping/i.test(h.label)));
  });

  it("extracts commercial mechanics from headings, product copy, and CTAs", () => {
    const hints = collectOfferHints(
      signals({
        headings: ["30-day money-back guarantee"],
        productText: "Every plan starts at $49 with no setup fee.",
        ctaTexts: ["Get a free quote"],
      })
    );
    const labels = hints.map((h) => h.label);
    assert.ok(labels.some((l) => /money-back guarantee/i.test(l)), labels.join(" | "));
    assert.ok(labels.some((l) => /\$49/.test(l)), labels.join(" | "));
    assert.ok(labels.some((l) => /free quote/i.test(l)), labels.join(" | "));
  });

  it("classifies commercial terms and rejects bare product names", () => {
    assert.equal(isCommercialTerm("Free shipping over $35"), true);
    assert.equal(isCommercialTerm("30-day money-back guarantee"), true);
    assert.equal(isCommercialTerm("Flat-rate quotes before work starts"), true);
    assert.equal(isCommercialTerm("Vitamin D3 Softgels"), false);
    assert.equal(isCommercialTerm("Camera drain inspection"), false);
    assert.equal(isCommercialTerm("Magnesium glycinate"), false);
  });

  /**
   * Each string below is a real product name, brand, or page phrase that an
   * earlier vocabulary-gated version of this extractor published as an offer.
   * A false offer is restated as a factual claim in generated marketing copy,
   * so precision is weighted above recall here.
   */
  it("never mistakes a product name or brand promise for an offer", () => {
    for (const notAnOffer of [
      "Gluten-Free Menu",
      "Sugar-Free Red Bull",
      "worry-free plumbing",
      "distraction-free",
      "Free Range Chicken",
      "Extended Warranty Plan",
      "Saia Guaranteed 10 a.m.",
      "5-hour ENERGY",
      "Claritin 24 Hour",
      "trial size",
      "12 Pack",
    ]) {
      assert.equal(isCommercialTerm(notAnOffer), false, notAnOffer);
    }
  });

  /**
   * Price comparison is ZYNAVA's product, not an offer it makes. Guards against
   * re-adding fixture-shaped patterns like `pricing` or `price per serving`.
   */
  it("does not treat a company's own capability copy as an offer", () => {
    for (const capability of [
      "Compare Supplement Prices Based on Your Preferences",
      "AI-powered supplement search and price-comparison engine.",
      "shows the lowest observed price and price per serving when verified",
      "Browse supplement guides, use free tools, or compare retailer deals",
    ]) {
      assert.equal(isCommercialTerm(capability), false, capability);
    }
  });

  it("recognizes money, discounts, and risk reversal across industries", () => {
    for (const offer of [
      "$29 new patient exam & X-rays",
      "Dentures starting at $499 per arch",
      "$300 off Motto Clear Aligners",
      "50% off for 3 months",
      "Volume LTL discounts for regular shippers",
      "no contracts, no monthly fees",
      "Written on-time or 100% refund",
      "Walk-ins welcome during business hours",
      "Gift vouchers valid for 12 months",
      "Get an instant quote in under 2 minutes",
      "Free — no sign-up required.",
    ]) {
      assert.equal(isCommercialTerm(offer), true, offer);
    }
  });

  it("still recognizes page-level source URLs", () => {
    assert.equal(
      isPageLevelSourceUrl(
        "https://example.com/catalog/vitamin-d3",
        "https://example.com"
      ),
      true
    );
    assert.equal(
      isPageLevelSourceUrl("https://example.com/", "https://example.com"),
      false
    );
  });
});

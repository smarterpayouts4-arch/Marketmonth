import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseMarketingFocus,
  DEFAULT_MARKETING_FOCUS_OPTIONS,
} from "./marketing-focus";

describe("marketingFocus", () => {
  it("accepts known focus values and empty", () => {
    assert.equal(parseMarketingFocus(undefined).ok, true);
    const brand = parseMarketingFocus("brand_awareness");
    assert.equal(brand.ok, true);
    if (brand.ok) assert.equal(brand.value, "brand_awareness");

    const decision = parseMarketingFocus("decision_support");
    assert.equal(decision.ok, true);
    if (decision.ok) assert.equal(decision.value, "decision_support");
  });

  it("rejects unknown focus values", () => {
    const bad = parseMarketingFocus("growth_hacking");
    assert.equal(bad.ok, false);
  });

  it("exposes four default dashboard options", () => {
    assert.equal(DEFAULT_MARKETING_FOCUS_OPTIONS.length, 4);
  });
});

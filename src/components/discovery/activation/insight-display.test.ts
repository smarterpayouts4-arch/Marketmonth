import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizeInsightCompare,
  shouldSuppressInsight,
} from "./insight-display";

describe("shouldSuppressInsight", () => {
  it("keeps related but distinct strategic vs observed pairs", () => {
    assert.equal(
      shouldSuppressInsight(
        "Zynava’s clearest entry point is its personalized product explorer.",
        "The website leads with the Supplement Options Explorer."
      ),
      false
    );
  });

  it("suppresses normalized exact / near-identical duplicates", () => {
    assert.equal(
      shouldSuppressInsight(
        "The lead offer is the Supplement Options Explorer.",
        "Lead offer: Supplement Options Explorer."
      ),
      true
    );
    assert.equal(
      shouldSuppressInsight(
        "Supplement Options Explorer",
        "Supplement Options Explorer"
      ),
      true
    );
  });

  it("does not suppress empty pairs", () => {
    assert.equal(shouldSuppressInsight("", "Something"), false);
    assert.equal(shouldSuppressInsight("Something", ""), false);
  });
});

describe("normalizeInsightCompare", () => {
  it("strips trivial lead-offer prefixes", () => {
    assert.equal(
      normalizeInsightCompare("Lead offer: Options Explorer"),
      normalizeInsightCompare("Options Explorer")
    );
  });
});

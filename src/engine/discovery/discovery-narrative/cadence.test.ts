import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { recommendCadence, type ContentInventoryScore } from "./cadence";

function score(partial: Partial<ContentInventoryScore>): ContentInventoryScore {
  return {
    score: 0,
    productsServices: 0,
    faqs: 0,
    educationalTopics: 0,
    ownedTopics: 0,
    seoOpportunities: 0,
    trustSignals: 0,
    detectedChannels: 0,
    ...partial,
  };
}

describe("recommendCadence", () => {
  it("always classifies as recommended by Market Month", () => {
    const light = recommendCadence(score({ score: 8 }));
    const consistent = recommendCadence(score({ score: 28 }));
    const active = recommendCadence(score({ score: 50 }));

    assert.equal(light.classification, "recommended");
    assert.equal(consistent.classification, "recommended");
    assert.equal(active.classification, "recommended");
    assert.equal(light.level, "light");
    assert.equal(consistent.level, "consistent");
    assert.equal(active.level, "active");
  });

  it("does not auto-select daily from inventory score alone", () => {
    const rich = recommendCadence(score({ score: 99 }));
    assert.notEqual(rich.level, "daily");
  });
});

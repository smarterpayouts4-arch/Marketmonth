import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { REVEAL_LABELS, REVEAL_ORDER } from "./types";
import { toStrategyIntentAnswers } from "./to-strategy-intent";

describe("toStrategyIntentAnswers additive bridge", () => {
  it("derives legacy goal/growthDirection from cadence + pillar", () => {
    const answers = toStrategyIntentAnswers(
      {
        cadenceLevel: "consistent",
        channels: ["facebook", "linkedin"],
        pillarId: "compare-clearly",
      },
      { pillarLabel: "Compare clearly" }
    );

    assert.equal(answers.goal, "awareness");
    assert.equal(answers.growthDirection, "better_value");
    assert.equal(answers.promoteFirst, "Compare clearly");
    assert.equal(answers.cadenceLevel, "consistent");
    assert.deepEqual(answers.channels, ["facebook", "linkedin"]);
    assert.ok((answers.growthThesis ?? "").length > 0);
  });

  it("maps trust/decode pillars to confidence growthDirection", () => {
    const answers = toStrategyIntentAnswers({
      cadenceLevel: "active",
      channels: ["youtube"],
      pillarId: "build-trust",
    });
    assert.equal(answers.goal, "leads");
    assert.equal(answers.growthDirection, "confidence");
  });
});

describe("discovery reveal contract", () => {
  it("exposes exactly three sections in product order", () => {
    assert.deepEqual(REVEAL_ORDER, ["doing-well", "win", "content-play"]);
    assert.equal(REVEAL_LABELS["doing-well"], "What You’re Doing Well");
    assert.equal(REVEAL_LABELS.win, "Where You Can Win");
    assert.equal(REVEAL_LABELS["content-play"], "Your Content Play");
  });

  it("investment readiness requires all three sections viewed", () => {
    const viewed = {
      "doing-well": true,
      win: true,
      "content-play": false,
    };
    const allViewed =
      viewed["doing-well"] && viewed.win && viewed["content-play"];
    assert.equal(allViewed, false);
    viewed["content-play"] = true;
    assert.equal(
      viewed["doing-well"] && viewed.win && viewed["content-play"],
      true
    );
  });
});

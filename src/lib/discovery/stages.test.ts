import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DISCOVERY_STAGES, type DiscoveryStageId } from "./stages";

describe("discovery stages contract", () => {
  it("exposes five ordered LEARN stages with stable ids", () => {
    assert.equal(DISCOVERY_STAGES.length, 5);
    const ids = DISCOVERY_STAGES.map((s) => s.id);
    assert.deepEqual(ids, [
      "crawling",
      "understanding_audience",
      "finding_offers",
      "reviewing_social",
      "building_profile",
    ]);
  });

  it("every stage has a non-empty label for UI pending state", () => {
    for (const stage of DISCOVERY_STAGES) {
      assert.ok(stage.label.trim().length > 0, stage.id);
    }
  });

  it("stage ids are unique (no ambiguous stream mapping)", () => {
    const ids = DISCOVERY_STAGES.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("DiscoveryStageId union matches catalog", () => {
    const id: DiscoveryStageId = "crawling";
    assert.ok(DISCOVERY_STAGES.some((s) => s.id === id));
  });
});

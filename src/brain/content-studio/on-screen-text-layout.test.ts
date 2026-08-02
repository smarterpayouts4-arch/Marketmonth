import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildOnScreenTextLayout,
  splitOnScreenTextBlocks,
} from "./on-screen-text-layout";

describe("on-screen-text-layout (shared DOM/compose)", () => {
  it("splits blank-line OST blocks consistently", () => {
    const blocks = splitOnScreenTextBlocks(
      "Why is\nmagnesium\nattracting\nattention?\n\nEspecially\nbefore bed.\n\nEducational only • not medical advice"
    );
    assert.match(blocks.title, /magnesium/i);
    assert.match(blocks.support ?? "", /Especially before bed/i);
    assert.match(blocks.disclaimer ?? "", /Educational only/);
  });

  it("defaults showSceneBadge to false and clears sceneLabel", () => {
    const layout = buildOnScreenTextLayout({
      onScreenText: "Why is magnesium attracting attention?",
      sceneOrder: 0,
    });
    assert.equal(layout.showSceneBadge, false);
    assert.equal(layout.sceneLabel, "");
    assert.ok(layout.titleLines.length >= 1);
  });

  it("only emits Scene N when showSceneBadge is opted in", () => {
    const layout = buildOnScreenTextLayout({
      onScreenText: "Hook title",
      sceneOrder: 2,
      showSceneBadge: true,
    });
    assert.equal(layout.showSceneBadge, true);
    assert.equal(layout.sceneLabel, "Scene 3");
  });
});

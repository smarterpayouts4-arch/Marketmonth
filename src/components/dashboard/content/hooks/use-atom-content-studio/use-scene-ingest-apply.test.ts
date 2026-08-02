import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SceneEditFields } from "./types";
import { EMPTY_SCENE } from "./types";

/**
 * Mirrors applyExtractedToSelectedScene merge rules (no React): empty OST/motion
 * from extract must not wipe prior Manual draft values.
 */
function applyExtracted(
  prior: SceneEditFields,
  extracted: SceneEditFields
): SceneEditFields {
  const nextOst = extracted.onScreenText.trim()
    ? extracted.onScreenText
    : prior.onScreenText;
  const nextMotion = extracted.motionPrompt.trim()
    ? extracted.motionPrompt
    : prior.motionPrompt;
  return {
    visualPrompt: extracted.visualPrompt,
    narration: extracted.narration,
    onScreenText: nextOst,
    motionPrompt: nextMotion,
    assetType: extracted.assetType,
  };
}

describe("ingest draft apply merge", () => {
  it("includes motionPrompt from extract", () => {
    const next = applyExtracted(EMPTY_SCENE, {
      visualPrompt: "Still",
      narration: "Spoken",
      onScreenText: "Title",
      motionPrompt: "She drinks water.",
      assetType: "video",
    });
    assert.equal(next.motionPrompt, "She drinks water.");
    assert.equal(next.assetType, "video");
  });

  it("empty extraction cannot wipe a valid onScreenText", () => {
    const next = applyExtracted(
      {
        ...EMPTY_SCENE,
        onScreenText: "Why is\nmagnesium\nattracting attention?",
      },
      {
        visualPrompt: "Still",
        narration: "Spoken",
        onScreenText: "",
        motionPrompt: "",
        assetType: "image",
      }
    );
    assert.equal(
      next.onScreenText,
      "Why is\nmagnesium\nattracting attention?"
    );
  });

  it("existing motionPrompt survives image-only paste without motion", () => {
    const next = applyExtracted(
      {
        ...EMPTY_SCENE,
        motionPrompt: "Prior motion keep me",
        assetType: "video",
      },
      {
        visualPrompt: "New still",
        narration: "New spoken",
        onScreenText: "New title",
        motionPrompt: "",
        assetType: "image",
      }
    );
    assert.equal(next.motionPrompt, "Prior motion keep me");
    assert.equal(next.assetType, "image");
  });
});

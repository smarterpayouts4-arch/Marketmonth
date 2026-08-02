import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { composeEffectiveVeoPrompt } from "./compose-effective-veo-prompt";
import { planSceneFullGenerate } from "./plan-scene-full-generate";
import type { SceneCard } from "./schemas/format-package";

const baseTarget = {
  visualPrompt: "Still plate prompt",
  narration: "Hook line for voice.",
  onScreenText: "TITLE\nSupport",
  motionPrompt: "She lifts the glass and drinks.",
  assetType: "video" as const,
};

function scene(partial: Partial<SceneCard> & Pick<SceneCard, "id">): SceneCard {
  return {
    id: partial.id,
    order: partial.order ?? 0,
    durationSeconds: partial.durationSeconds ?? 8,
    narration: partial.narration ?? baseTarget.narration,
    onScreenText: partial.onScreenText ?? baseTarget.onScreenText,
    visualPrompt: partial.visualPrompt ?? baseTarget.visualPrompt,
    motionPrompt: partial.motionPrompt ?? baseTarget.motionPrompt,
    assetType: partial.assetType ?? "video",
    render: partial.render,
    voice: partial.voice,
    video: partial.video,
    composedVideo: partial.composedVideo,
  };
}

describe("planSceneFullGenerate", () => {
  it("fresh scene plans save + all generates (skip none for video)", () => {
    const plan = planSceneFullGenerate({
      scene: scene({ id: "s1" }),
      target: baseTarget,
      needsSave: true,
    });
    assert.equal(plan.save, true);
    assert.equal(plan.image, "generate");
    assert.equal(plan.voice, "generate");
    assert.equal(plan.veo, "generate");
    assert.equal(plan.compose, "generate");
  });

  it("reuses all when provenance matches", () => {
    const still = "https://cdn.example.com/still.png";
    const motion = "https://cdn.example.com/motion.mp4";
    const voiceUrl = "https://cdn.example.com/voice.wav";
    const veoPrompt = composeEffectiveVeoPrompt({
      motionPrompt: baseTarget.motionPrompt,
      visualPrompt: baseTarget.visualPrompt,
    });
    const plan = planSceneFullGenerate({
      scene: scene({
        id: "s1",
        render: {
          status: "succeeded",
          assetUrl: still,
          visualPromptUsed: baseTarget.visualPrompt,
          assetTypeUsed: "video",
        },
        voice: {
          status: "succeeded",
          assetUrl: voiceUrl,
          scriptUsed: baseTarget.narration,
        },
        video: {
          status: "succeeded",
          assetUrl: motion,
          promptUsed: veoPrompt,
          sourceImageUrl: still,
        },
        composedVideo: {
          status: "succeeded",
          assetUrl: "https://cdn.example.com/final.mp4",
          onScreenTextUsed: baseTarget.onScreenText,
          voiceScriptUsed: baseTarget.narration,
          sourceVoiceUrl: voiceUrl,
          sourceVisualUrl: motion,
          sourceImageUrl: still,
        },
      }),
      target: baseTarget,
      needsSave: false,
    });
    assert.deepEqual(plan, {
      save: false,
      image: "reuse",
      voice: "reuse",
      veo: "reuse",
      compose: "reuse",
    });
  });

  it("OST-only change regenerates compose only", () => {
    const still = "https://cdn.example.com/still.png";
    const motion = "https://cdn.example.com/motion.mp4";
    const voiceUrl = "https://cdn.example.com/voice.wav";
    const veoPrompt = composeEffectiveVeoPrompt({
      motionPrompt: baseTarget.motionPrompt,
      visualPrompt: baseTarget.visualPrompt,
    });
    const plan = planSceneFullGenerate({
      scene: scene({
        id: "s1",
        render: {
          status: "succeeded",
          assetUrl: still,
          visualPromptUsed: baseTarget.visualPrompt,
          assetTypeUsed: "video",
        },
        voice: {
          status: "succeeded",
          assetUrl: voiceUrl,
          scriptUsed: baseTarget.narration,
        },
        video: {
          status: "succeeded",
          assetUrl: motion,
          promptUsed: veoPrompt,
          sourceImageUrl: still,
        },
        composedVideo: {
          status: "succeeded",
          assetUrl: "https://cdn.example.com/final.mp4",
          onScreenTextUsed: "OLD TITLE",
          voiceScriptUsed: baseTarget.narration,
          sourceVoiceUrl: voiceUrl,
          sourceVisualUrl: motion,
        },
      }),
      target: { ...baseTarget, onScreenText: "NEW TITLE" },
      needsSave: true,
    });
    assert.equal(plan.save, true);
    assert.equal(plan.image, "reuse");
    assert.equal(plan.voice, "reuse");
    assert.equal(plan.veo, "reuse");
    assert.equal(plan.compose, "generate");
  });

  it("motion prompt change regenerates veo + compose", () => {
    const still = "https://cdn.example.com/still.png";
    const motion = "https://cdn.example.com/motion.mp4";
    const voiceUrl = "https://cdn.example.com/voice.wav";
    const oldVeo = composeEffectiveVeoPrompt({
      motionPrompt: baseTarget.motionPrompt,
      visualPrompt: baseTarget.visualPrompt,
    });
    const plan = planSceneFullGenerate({
      scene: scene({
        id: "s1",
        render: {
          status: "succeeded",
          assetUrl: still,
          visualPromptUsed: baseTarget.visualPrompt,
          assetTypeUsed: "video",
        },
        voice: {
          status: "succeeded",
          assetUrl: voiceUrl,
          scriptUsed: baseTarget.narration,
        },
        video: {
          status: "succeeded",
          assetUrl: motion,
          promptUsed: oldVeo,
          sourceImageUrl: still,
        },
        composedVideo: {
          status: "succeeded",
          assetUrl: "https://cdn.example.com/final.mp4",
          onScreenTextUsed: baseTarget.onScreenText,
          voiceScriptUsed: baseTarget.narration,
          sourceVoiceUrl: voiceUrl,
          sourceVisualUrl: motion,
        },
      }),
      target: { ...baseTarget, motionPrompt: "New motion only." },
      needsSave: true,
    });
    assert.equal(plan.image, "reuse");
    assert.equal(plan.voice, "reuse");
    assert.equal(plan.veo, "generate");
    assert.equal(plan.compose, "generate");
  });

  it("visual prompt change cascades image + veo + compose", () => {
    const still = "https://cdn.example.com/still.png";
    const plan = planSceneFullGenerate({
      scene: scene({
        id: "s1",
        render: {
          status: "succeeded",
          assetUrl: still,
          visualPromptUsed: baseTarget.visualPrompt,
          assetTypeUsed: "video",
        },
        voice: {
          status: "succeeded",
          assetUrl: "https://cdn.example.com/voice.wav",
          scriptUsed: baseTarget.narration,
        },
      }),
      target: { ...baseTarget, visualPrompt: "Changed still essay" },
      needsSave: true,
    });
    assert.equal(plan.image, "generate");
    assert.equal(plan.voice, "reuse");
    assert.equal(plan.veo, "generate");
    assert.equal(plan.compose, "generate");
  });

  it("image assetType skips veo", () => {
    const plan = planSceneFullGenerate({
      scene: scene({ id: "s1", assetType: "image" }),
      target: { ...baseTarget, assetType: "image", motionPrompt: "" },
      needsSave: false,
    });
    assert.equal(plan.veo, "skip");
    assert.equal(plan.image, "generate");
    assert.equal(plan.compose, "generate");
  });

  it("styleChanged forces image even when visualPromptUsed matches", () => {
    const still = "https://cdn.example.com/still.png";
    const plan = planSceneFullGenerate({
      scene: scene({
        id: "s1",
        render: {
          status: "succeeded",
          assetUrl: still,
          visualPromptUsed: baseTarget.visualPrompt,
          assetTypeUsed: "video",
        },
      }),
      target: baseTarget,
      needsSave: true,
      styleChanged: true,
    });
    assert.equal(plan.image, "generate");
    assert.equal(plan.veo, "generate");
    assert.equal(plan.compose, "generate");
  });
});

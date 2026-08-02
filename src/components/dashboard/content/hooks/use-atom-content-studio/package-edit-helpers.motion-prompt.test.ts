import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SceneCard, YouTubeShortFormatPackage } from "@/brain/content-studio";

import {
  baselineSceneFields,
  buildScenePatches,
  sceneEditsFromPackage,
  sceneFieldsFromScene,
} from "./package-edit-helpers";
import { EMPTY_SCENE } from "./types";

function scene(partial: Partial<SceneCard> & Pick<SceneCard, "id">): SceneCard {
  return {
    id: partial.id,
    order: partial.order ?? 0,
    durationSeconds: partial.durationSeconds ?? 5,
    narration: partial.narration ?? "Narration",
    onScreenText: partial.onScreenText ?? "Title",
    visualPrompt: partial.visualPrompt ?? "Still plate",
    motionPrompt: partial.motionPrompt,
    assetType: partial.assetType ?? "image",
  };
}

function pkg(scenes: SceneCard[]): YouTubeShortFormatPackage {
  return {
    id: "fmt_test",
    atomId: "atom_test",
    atomRevision: 1,
    formatId: "youtube_short",
    status: "ready_for_review",
    title: "Test",
    durationSeconds: 10,
    aspectRatio: "9:16",
    hook: "Hook",
    voiceoverPrompt: "VO",
    imagePrompt: "Image",
    script: "Script",
    scenes,
    audienceAction: "Subscribe",
    evidenceRefs: [],
    unresolvedResearch: [],
    warnings: [],
    generation: {
      templateVersion: "test",
      adapterVersion: "test",
      idempotencyKey: "test-key",
      model: "test",
      generatedAt: "2026-01-01T00:00:00.000Z",
    },
    generatedBaseline: {
      imagePrompt: "Image",
      voiceoverPrompt: "VO",
      script: "Script",
      scenes: {
        [scenes[0]!.id]: {
          visualPrompt: scenes[0]!.visualPrompt,
          narration: scenes[0]!.narration,
          onScreenText: scenes[0]!.onScreenText,
          motionPrompt: "Baseline motion",
          assetType: scenes[0]!.assetType ?? "image",
        },
      },
    },
  };
}

describe("package-edit-helpers motionPrompt", () => {
  it("maps scene.motionPrompt into Manual draft fields", () => {
    const s = scene({
      id: "sm_1",
      assetType: "video",
      motionPrompt: "She lifts the glass and drinks.",
    });
    const fields = sceneFieldsFromScene(s);
    assert.equal(fields.motionPrompt, "She lifts the glass and drinks.");
    assert.equal(fields.visualPrompt, "Still plate");
    assert.equal(fields.assetType, "video");
  });

  it("defaults missing motionPrompt to empty string (image scenes)", () => {
    const fields = sceneFieldsFromScene(scene({ id: "sm_1" }));
    assert.equal(fields.motionPrompt, "");
    assert.equal(fields.assetType, "image");
  });

  it("sceneEditsFromPackage preserves motionPrompt across scenes", () => {
    const edits = sceneEditsFromPackage(
      pkg([
        scene({
          id: "sm_1",
          assetType: "video",
          motionPrompt: "Action A",
        }),
        scene({
          id: "sm_2",
          order: 1,
          motionPrompt: "Action B",
        }),
      ])
    );
    assert.equal(edits.sm_1?.motionPrompt, "Action A");
    assert.equal(edits.sm_2?.motionPrompt, "Action B");
  });

  it("buildScenePatches includes motionPrompt when dirty", () => {
    const short = pkg([
      scene({
        id: "sm_1",
        assetType: "video",
        motionPrompt: "Old motion",
      }),
    ]);
    const patches = buildScenePatches(short, {
      sm_1: {
        ...EMPTY_SCENE,
        ...sceneFieldsFromScene(short.scenes[0]!),
        motionPrompt: "New motion",
      },
    });
    assert.deepEqual(patches.sm_1, { motionPrompt: "New motion" });
  });

  it("baselineSceneFields restores generated motionPrompt", () => {
    const short = pkg([
      scene({
        id: "sm_1",
        assetType: "video",
        motionPrompt: "Edited motion",
      }),
    ]);
    const baseline = baselineSceneFields(short, "sm_1");
    assert.equal(baseline.motionPrompt, "Baseline motion");
  });
});

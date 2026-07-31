import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  SceneCard,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio/schemas/format-package";

import { composeEffectiveImagePrompt } from "./compose-effective-image-prompt";
import {
  applyDurableEditsToShortPackage,
  resetShortSceneToGeneratedBaseline,
} from "./durable-edits";
import {
  addShortScene,
  applyShortSceneStructureAction,
  increaseShortSceneCount,
  removeShortScene,
} from "./scene-structure";
import { validateShortFormatPackage } from "./validate-format-package";
import {
  YOUTUBE_SHORT_SCENE_COUNT_MAX,
  YOUTUBE_SHORT_SCENE_COUNT_MIN,
} from "./youtube-short-draft";

function basePkg(sceneCount = 3): YouTubeShortFormatPackage {
  const scenes = Array.from({ length: sceneCount }, (_, i) => ({
    id: `s${i + 1}_scene`,
    order: i,
    durationSeconds: 3,
    narration: `Narration ${i + 1}`,
    onScreenText: `OST ${i + 1}`,
    visualPrompt: `Visual ${i + 1}`,
    assetType: "image" as const,
  }));
  const sceneBaselines = Object.fromEntries(
    scenes.map((s) => [
      s.id,
      {
        visualPrompt: s.visualPrompt,
        narration: s.narration,
        onScreenText: s.onScreenText,
        assetType: s.assetType,
      },
    ])
  );
  return {
    id: "fmt_test_short",
    atomId: "atom_test",
    atomRevision: 1,
    formatId: "youtube_short",
    status: "draft",
    title: "Test Short",
    durationSeconds: sceneCount * 3,
    aspectRatio: "9:16",
    hook: "Hook",
    voiceoverPrompt: "VO",
    imagePrompt: "Image",
    script: "Master script",
    scenes,
    caption: "Caption",
    audienceAction: "Act",
    evidenceRefs: [],
    unresolvedResearch: [],
    warnings: [],
    generation: {
      provider: "deterministic",
      model: "none",
      templateVersion: "t1",
      adapterVersion: "a1",
      generatedAt: new Date().toISOString(),
      idempotencyKey: "k1",
    },
    generatedBaseline: {
      imagePrompt: "Image",
      voiceoverPrompt: "VO",
      script: "Master script",
      scenes: sceneBaselines,
    },
    durableEdits: {
      scenes: {
        s1_scene: { visualPrompt: "Durable visual 1" },
      },
    },
  };
}

describe("YouTube Short scene structure (Phase 3D)", () => {
  it("expands a Manual Short to nine scenes with stable unique IDs", () => {
    const pkg = basePkg(3);
    const priorIds = pkg.scenes.map((s) => s.id);
    const result = increaseShortSceneCount(pkg, 9);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.package.scenes.length, 9);
    const ids = result.package.scenes.map((s) => s.id);
    assert.deepEqual(ids.slice(0, 3), priorIds);
    assert.equal(new Set(ids).size, 9);
    for (const id of result.addedSceneIds) {
      assert.match(id, /^sm_[a-f0-9]{12}$/);
    }
  });

  it("preserves existing scenes and durable edits when increasing count", () => {
    const pkg = basePkg(3);
    const result = increaseShortSceneCount(pkg, 9);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(
      result.package.durableEdits?.scenes?.s1_scene?.visualPrompt,
      "Durable visual 1"
    );
    assert.equal(result.package.scenes[0]?.visualPrompt, "Visual 1");
    assert.equal(result.package.scenes[0]?.id, "s1_scene");
  });

  it("new scenes begin empty except assetType=image", () => {
    const result = increaseShortSceneCount(basePkg(3), 5);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const pkg = result.package;
    const addedIds = result.addedSceneIds;
    for (const id of addedIds) {
      const scene: SceneCard | undefined = pkg.scenes.find((s) => s.id === id);
      assert.ok(scene);
      assert.equal(scene.visualPrompt, "");
      assert.equal(scene.narration, "");
      assert.equal(scene.onScreenText, "");
      assert.equal(scene.assetType, "image");
      assert.notEqual(scene.visualPrompt, pkg.script);
    }
  });

  it("rejects decreasing via setCount (no archive schema)", () => {
    const result = increaseShortSceneCount(basePkg(5), 3);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /archive|Remove one scene/i);
  });

  it("addScene appends one empty scene and selects it via action hint", () => {
    const action = applyShortSceneStructureAction(basePkg(3), {
      addScene: true,
    });
    assert.equal(action.ok, true);
    if (!action.ok) return;
    assert.equal(action.package.scenes.length, 4);
    assert.ok(action.selectedSceneIdHint);
    assert.match(action.selectedSceneIdHint!, /^sm_/);
  });

  it("removeScene requires explicit id and preserves remaining stable IDs", () => {
    const pkg = basePkg(4);
    const before = pkg.scenes.map((s) => s.id);
    const removed = removeShortScene(pkg, "s2_scene");
    assert.equal(removed.ok, true);
    if (!removed.ok) return;
    const after = removed.package.scenes.map((s) => s.id);
    assert.deepEqual(after, ["s1_scene", "s3_scene", "s4_scene"]);
    assert.equal(after.includes("s2_scene"), false);
    assert.deepEqual(
      before.filter((id) => id !== "s2_scene"),
      after
    );
    assert.equal(removed.package.scenes[0]?.order, 0);
    assert.equal(removed.package.scenes[1]?.order, 1);
  });

  it("remove action selects the nearest remaining scene", () => {
    const pkg = basePkg(4);
    const mid = applyShortSceneStructureAction(pkg, {
      removeSceneId: "s2_scene",
    });
    assert.equal(mid.ok, true);
    if (!mid.ok) return;
    // Index 1 removed → scene that slid into index 1 is former s3
    assert.equal(mid.selectedSceneIdHint, "s3_scene");

    const last = applyShortSceneStructureAction(pkg, {
      removeSceneId: "s4_scene",
    });
    assert.equal(last.ok, true);
    if (!last.ok) return;
    assert.equal(last.selectedSceneIdHint, "s3_scene");
  });

  it("never removes below product minimum scene count", () => {
    const pkg = basePkg(YOUTUBE_SHORT_SCENE_COUNT_MIN);
    const result = removeShortScene(pkg, "s1_scene");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, new RegExp(String(YOUTUBE_SHORT_SCENE_COUNT_MIN)));
  });

  it("rejects add beyond max", () => {
    const pkg = basePkg(YOUTUBE_SHORT_SCENE_COUNT_MAX);
    const result = addShortScene(pkg);
    assert.equal(result.ok, false);
  });

  it("composeEffectiveImagePrompt joins global + scene without calling providers", () => {
    assert.equal(
      composeEffectiveImagePrompt("Global look", "Scene look"),
      "Global look\n\nScene look"
    );
    assert.equal(composeEffectiveImagePrompt("", "Scene look"), "Scene look");
    assert.equal(composeEffectiveImagePrompt("Global look", ""), "Global look");
  });

  it("Reset Scene on empty Manual opening stays valid while later scenes stay filled", () => {
    const scaffold = basePkg(3);
    const emptyBaselines = Object.fromEntries(
      scaffold.scenes.map((s) => [
        s.id,
        {
          visualPrompt: "",
          narration: "",
          onScreenText: "",
          assetType: "image" as const,
        },
      ])
    );
    const manual = applyDurableEditsToShortPackage(
      {
        ...scaffold,
        scenes: scaffold.scenes.map((s) => ({
          ...s,
          narration: "",
          visualPrompt: "",
          onScreenText: "",
        })),
        generatedBaseline: {
          imagePrompt: "",
          voiceoverPrompt: "",
          script: "",
          scenes: emptyBaselines,
        },
        durableEdits: undefined,
      },
      {
        scenes: {
          s1_scene: {
            narration: "Manual open",
            visualPrompt: "Open visual",
          },
          s2_scene: {
            narration: "Manual two",
            visualPrompt: "Two visual",
          },
        },
      }
    );
    const resetOpen = resetShortSceneToGeneratedBaseline(manual, "s1_scene");
    assert.equal(resetOpen.scenes[0]?.narration, "");
    assert.equal(
      resetOpen.scenes.find((s) => s.id === "s2_scene")?.narration,
      "Manual two"
    );
    const errors = validateShortFormatPackage(
      resetOpen,
      { atom_id: "atom_test" } as never,
      1
    );
    assert.deepEqual(errors, []);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { YouTubeShortFormatPackage } from "@/brain/content-studio/schemas/format-package";

import {
  applyAssetStaleRules,
  computeSceneStaleFlags,
  isAssetCurrent,
  isAssetStale,
} from "./asset-stale-rules";

function baseScene(overrides: Record<string, unknown> = {}) {
  return {
    id: "scene_1",
    order: 0,
    durationSeconds: 5,
    narration: "Hello world",
    onScreenText: "HELLO",
    visualPrompt: "A product on a desk",
    assetType: "image" as const,
    ...overrides,
  };
}

function basePkg(
  scenes: ReturnType<typeof baseScene>[]
): YouTubeShortFormatPackage {
  return {
    id: "pkg_1",
    atomId: "atom_1",
    atomRevision: 1,
    formatId: "youtube_short",
    status: "draft",
    title: "Test",
    durationSeconds: 15,
    aspectRatio: "9:16",
    hook: "Hook",
    voiceoverPrompt: "VO",
    imagePrompt: "IMG",
    script: "Script",
    scenes: scenes as YouTubeShortFormatPackage["scenes"],
    audienceAction: "Follow",
    evidenceRefs: [],
    unresolvedResearch: [],
    warnings: [],
    generation: {
      templateVersion: "t1",
      adapterVersion: "a1",
      idempotencyKey: "k1",
    },
  };
}

describe("computeSceneStaleFlags", () => {
  it("marks composed stale when on-screen text changes", () => {
    const before = baseScene();
    const after = baseScene({ onScreenText: "NEW TITLE" });
    const flags = computeSceneStaleFlags(before, after);
    assert.equal(flags.composedVideo, true);
    assert.equal(flags.voice, false);
    assert.equal(flags.render, false);
  });

  it("marks voice and composed stale when narration changes", () => {
    const before = baseScene();
    const after = baseScene({ narration: "New narration" });
    const flags = computeSceneStaleFlags(before, after);
    assert.equal(flags.voice, true);
    assert.equal(flags.composedVideo, true);
    assert.equal(flags.render, false);
  });

  it("marks render, video, and composed when visualPrompt changes", () => {
    const before = baseScene();
    const after = baseScene({ visualPrompt: "Different still" });
    const flags = computeSceneStaleFlags(before, after);
    assert.equal(flags.render, true);
    assert.equal(flags.video, true);
    assert.equal(flags.composedVideo, true);
  });
});

describe("applyAssetStaleRules", () => {
  it("sets composedVideo status to stale after OST edit and preserves URL", () => {
    const before = basePkg([
      baseScene({
        composedVideo: {
          status: "succeeded",
          assetUrl: "https://cdn.example.com/old.mp4",
          onScreenTextUsed: "HELLO",
        },
        voice: {
          status: "succeeded",
          assetUrl: "https://cdn.example.com/voice.mp3",
          scriptUsed: "Hello world",
          durationSeconds: 2.5,
        },
      }),
    ]);
    const after = basePkg([
      baseScene({
        onScreenText: "CHANGED",
        composedVideo: before.scenes[0]!.composedVideo,
        voice: before.scenes[0]!.voice,
      }),
    ]);

    const next = applyAssetStaleRules(before, after);
    assert.equal(next.scenes[0]!.composedVideo?.status, "stale");
    assert.equal(
      next.scenes[0]!.composedVideo?.assetUrl,
      "https://cdn.example.com/old.mp4"
    );
    assert.equal(next.scenes[0]!.voice?.status, "succeeded");
    assert.equal(isAssetStale(next.scenes[0]!.composedVideo?.status), true);
    assert.equal(isAssetCurrent(next.scenes[0]!.composedVideo?.status), false);
  });

  it("sets voice and composed stale after narration edit", () => {
    const before = basePkg([
      baseScene({
        voice: {
          status: "succeeded",
          assetUrl: "https://cdn.example.com/voice.mp3",
          scriptUsed: "Hello world",
          durationSeconds: 2.5,
        },
        composedVideo: {
          status: "succeeded",
          assetUrl: "https://cdn.example.com/old.mp4",
        },
      }),
    ]);
    const after = basePkg([
      baseScene({
        narration: "Changed narration",
        voice: before.scenes[0]!.voice,
        composedVideo: before.scenes[0]!.composedVideo,
      }),
    ]);

    const next = applyAssetStaleRules(before, after);
    assert.equal(next.scenes[0]!.voice?.status, "stale");
    assert.equal(next.scenes[0]!.composedVideo?.status, "stale");
  });

  it("invalidates finalShort when scene order/set changes", () => {
    const before = basePkg([
      baseScene({ id: "scene_1", order: 0 }),
      baseScene({ id: "scene_2", order: 1, narration: "Two" }),
    ]);
    before.finalShort = {
      status: "succeeded",
      assetUrl: "https://cdn.example.com/final.mp4",
      sourceHash: "abc",
      assemblyVersion: "manual-short-concat-v1",
    };
    const after = basePkg([
      baseScene({ id: "scene_2", order: 0, narration: "Two" }),
      baseScene({ id: "scene_1", order: 1 }),
    ]);
    after.finalShort = before.finalShort;
    const next = applyAssetStaleRules(before, after);
    assert.equal(next.finalShort?.status, "stale");
  });

  it("invalidates package finalShort when scene assets go stale", () => {
    const before = basePkg([
      baseScene({
        composedVideo: {
          status: "succeeded",
          assetUrl: "https://cdn.example.com/s1.mp4",
        },
      }),
    ]);
    before.finalShort = {
      status: "succeeded",
      assetUrl: "https://cdn.example.com/final.mp4",
      sceneIds: ["scene_1"],
    };
    const after = basePkg([
      baseScene({
        onScreenText: "NEW",
        composedVideo: before.scenes[0]!.composedVideo,
      }),
    ]);
    after.finalShort = before.finalShort;

    const next = applyAssetStaleRules(before, after);
    assert.equal(next.finalShort?.status, "stale");
  });
});

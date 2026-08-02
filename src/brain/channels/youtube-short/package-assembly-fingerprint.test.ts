import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { YouTubeShortFormatPackage } from "@/brain/content-studio/schemas/format-package";

import {
  computePackageAssemblyFingerprint,
  isFinalShortCurrent,
} from "./package-assembly-fingerprint";
import { markDownstreamAfterComposeRegen } from "./asset-stale-rules";

function pkg(
  scenes: YouTubeShortFormatPackage["scenes"],
  finalShort?: YouTubeShortFormatPackage["finalShort"]
): YouTubeShortFormatPackage {
  return {
    id: "pkg1",
    atomId: "atom1",
    atomRevision: 1,
    formatId: "youtube_short",
    status: "draft",
    title: "T",
    durationSeconds: 15,
    aspectRatio: "9:16",
    hook: "H",
    voiceoverPrompt: "V",
    imagePrompt: "I",
    script: "S",
    scenes,
    audienceAction: "Follow",
    evidenceRefs: [],
    unresolvedResearch: [],
    warnings: [],
    generation: {
      templateVersion: "t",
      adapterVersion: "a",
      idempotencyKey: "k",
    },
    finalShort,
  };
}

describe("package assembly fingerprint", () => {
  it("changes sourceHash when a scene is recomposed", () => {
    const scenesA: YouTubeShortFormatPackage["scenes"] = [
      {
        id: "s1",
        order: 0,
        durationSeconds: 5,
        narration: "a",
        visualPrompt: "a",
        assetType: "image",
        composedVideo: {
          status: "succeeded",
          assetUrl: "https://cdn.example.com/a.mp4",
          assetRef: "ref-a",
        },
      },
      {
        id: "s2",
        order: 1,
        durationSeconds: 5,
        narration: "b",
        visualPrompt: "b",
        assetType: "image",
        composedVideo: {
          status: "succeeded",
          assetUrl: "https://cdn.example.com/b.mp4",
          assetRef: "ref-b",
        },
      },
    ];
    const before = computePackageAssemblyFingerprint(pkg(scenesA));
    const scenesB = scenesA.map((s) =>
      s.id === "s1"
        ? {
            ...s,
            composedVideo: {
              ...s.composedVideo!,
              assetRef: "ref-a-new",
              assetUrl: "https://cdn.example.com/a2.mp4",
            },
          }
        : s
    );
    const after = computePackageAssemblyFingerprint(pkg(scenesB));
    assert.notEqual(before.sourceHash, after.sourceHash);
  });

  it("isFinalShortCurrent requires matching sourceHash", () => {
    const scenes: YouTubeShortFormatPackage["scenes"] = [
      {
        id: "s1",
        order: 0,
        durationSeconds: 5,
        narration: "a",
        visualPrompt: "a",
        assetType: "image",
        composedVideo: {
          status: "succeeded",
          assetUrl: "https://cdn.example.com/a.mp4",
          assetRef: "ref-a",
        },
      },
      {
        id: "s2",
        order: 1,
        durationSeconds: 5,
        narration: "b",
        visualPrompt: "b",
        assetType: "image",
        composedVideo: {
          status: "succeeded",
          assetUrl: "https://cdn.example.com/b.mp4",
          assetRef: "ref-b",
        },
      },
    ];
    const fp = computePackageAssemblyFingerprint(pkg(scenes));
    const current = pkg(scenes, {
      status: "succeeded",
      assetUrl: "https://cdn.example.com/final.mp4",
      sourceHash: fp.sourceHash,
      assemblyVersion: fp.assemblyVersion,
      orderedSceneIds: fp.orderedSceneIds,
      orderedComposedAssetIds: fp.orderedComposedAssetIds,
    });
    assert.equal(isFinalShortCurrent(current), true);

    const staleHash = pkg(scenes, {
      status: "succeeded",
      assetUrl: "https://cdn.example.com/final.mp4",
      sourceHash: "deadbeefdeadbeefdeadbeefdeadbeef",
      assemblyVersion: fp.assemblyVersion,
    });
    assert.equal(isFinalShortCurrent(staleHash), false);
  });

  it("compose regen marks finalShort stale", () => {
    const scenes: YouTubeShortFormatPackage["scenes"] = [
      {
        id: "s1",
        order: 0,
        durationSeconds: 5,
        narration: "a",
        visualPrompt: "a",
        assetType: "image",
      },
      {
        id: "s2",
        order: 1,
        durationSeconds: 5,
        narration: "b",
        visualPrompt: "b",
        assetType: "image",
      },
    ];
    const before = pkg(scenes, {
      status: "succeeded",
      assetUrl: "https://cdn.example.com/final.mp4",
      sourceHash: "abc",
      assemblyVersion: "manual-short-concat-v1",
    });
    const after = markDownstreamAfterComposeRegen(before);
    assert.equal(after.finalShort?.status, "stale");
    assert.equal(
      after.finalShort?.assetUrl,
      "https://cdn.example.com/final.mp4"
    );
  });
});

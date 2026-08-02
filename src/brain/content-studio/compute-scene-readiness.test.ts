import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SceneCard } from "@/brain/content-studio/schemas/format-package";

import {
  computePackageAssemblyReadiness,
  computeSceneReadiness,
} from "./compute-scene-readiness";

function scene(overrides: Partial<SceneCard> = {}): SceneCard {
  return {
    id: "s1",
    order: 0,
    durationSeconds: 5,
    narration: "Hello",
    visualPrompt: "A desk",
    assetType: "image",
    onScreenText: "HI",
    ...overrides,
  };
}

function readyAssets(overrides: Partial<SceneCard> = {}): Partial<SceneCard> {
  return {
    render: {
      status: "succeeded",
      assetUrl: "https://cdn.example.com/still.png",
      visualPromptUsed: "A desk",
      assetTypeUsed: "image",
    },
    voice: {
      status: "succeeded",
      assetUrl: "https://cdn.example.com/v.mp3",
      durationSeconds: 2,
      scriptUsed: "Hello",
    },
    composedVideo: {
      status: "succeeded",
      assetUrl: "https://cdn.example.com/c.mp4",
      onScreenTextUsed: "HI",
      voiceScriptUsed: "Hello",
    },
    ...overrides,
  };
}

describe("computeSceneReadiness", () => {
  it("marks image scene ready when all required assets are current", () => {
    const r = computeSceneReadiness({
      promptSaved: true,
      scene: scene(readyAssets()),
    });
    assert.equal(r.motion, "not_applicable");
    assert.equal(r.sceneReady, true);
  });

  it("does not treat failed status with retained URL as Ready", () => {
    const r = computeSceneReadiness({
      promptSaved: true,
      scene: scene(
        readyAssets({
          voice: {
            status: "failed",
            assetUrl: "https://cdn.example.com/old.mp3",
            durationSeconds: 2,
            scriptUsed: "Hello",
          },
        })
      ),
    });
    assert.equal(r.voice, "failed");
    assert.equal(r.sceneReady, false);
  });

  it("marks voice outdated when narration drifts from scriptUsed", () => {
    const r = computeSceneReadiness({
      promptSaved: true,
      scene: scene(
        readyAssets({
          narration: "Changed",
          voice: {
            status: "succeeded",
            assetUrl: "https://cdn.example.com/v.mp3",
            durationSeconds: 2,
            scriptUsed: "Hello",
          },
        })
      ),
    });
    assert.equal(r.voice, "outdated");
    assert.equal(r.sceneReady, false);
  });

  it("blocks assembly when composed is stale", () => {
    const r = computeSceneReadiness({
      promptSaved: true,
      scene: scene(
        readyAssets({
          composedVideo: {
            status: "stale",
            assetUrl: "https://cdn.example.com/c.mp4",
          },
        })
      ),
    });
    assert.equal(r.composed, "outdated");
    assert.equal(r.sceneReady, false);
  });

  it("requires motion for video assetType", () => {
    const r = computeSceneReadiness({
      promptSaved: true,
      scene: scene(
        readyAssets({
          assetType: "video",
          render: {
            status: "succeeded",
            assetUrl: "https://cdn.example.com/still.png",
            visualPromptUsed: "A desk",
            assetTypeUsed: "video",
          },
        })
      ),
    });
    assert.equal(r.motion, "missing");
    assert.equal(r.sceneReady, false);
  });
});

describe("computePackageAssemblyReadiness", () => {
  it("blocks until every scene is ready", () => {
    const ready = scene({
      id: "a",
      order: 0,
      ...readyAssets({
        render: {
          status: "succeeded",
          assetUrl: "https://cdn.example.com/a.png",
          visualPromptUsed: "A desk",
          assetTypeUsed: "image",
        },
        voice: {
          status: "succeeded",
          assetUrl: "https://cdn.example.com/a.mp3",
          durationSeconds: 1,
          scriptUsed: "Hello",
        },
        composedVideo: {
          status: "succeeded",
          assetUrl: "https://cdn.example.com/a.mp4",
          onScreenTextUsed: "HI",
          voiceScriptUsed: "Hello",
        },
      }),
    });
    const notReady = scene({
      id: "b",
      order: 1,
      render: {
        status: "succeeded",
        assetUrl: "https://cdn.example.com/b.png",
        visualPromptUsed: "A desk",
        assetTypeUsed: "image",
      },
    });
    const partial = computePackageAssemblyReadiness([ready, notReady]);
    assert.equal(partial.allReady, false);
    assert.equal(partial.readyScenes, 1);
    assert.match(partial.label, /1 of 2/);

    const full = computePackageAssemblyReadiness([
      ready,
      {
        ...notReady,
        voice: {
          status: "succeeded",
          assetUrl: "https://cdn.example.com/b.mp3",
          durationSeconds: 1,
          scriptUsed: "Hello",
        },
        composedVideo: {
          status: "succeeded",
          assetUrl: "https://cdn.example.com/b.mp4",
          onScreenTextUsed: "HI",
          voiceScriptUsed: "Hello",
        },
      },
    ]);
    assert.equal(full.allReady, true);
    assert.equal(full.label, "Ready to assemble");
  });
});

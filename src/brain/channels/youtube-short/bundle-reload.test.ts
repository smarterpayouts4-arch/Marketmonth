import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import type { ContentProductionBundle } from "@/brain/content-studio/schemas/format-package";
import {
  loadProductionBundle,
  saveProductionBundle,
} from "@/brain/content-studio/bundle-store";

/**
 * Reloading the application restores saved scene and asset states from the
 * durable production bundle JSON (not React state).
 */
describe("bundle reload restores asset states", () => {
  let prevCwd: string;
  let tempRoot: string;

  before(() => {
    prevCwd = process.cwd();
    tempRoot = mkdtempSync(path.join(tmpdir(), "mm-bundle-reload-"));
    process.chdir(tempRoot);
  });

  after(() => {
    process.chdir(prevCwd);
    try {
      rmSync(tempRoot, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("round-trips stale composedVideo through save/load", async () => {
    const bundle: ContentProductionBundle = {
      atomId: "atom_reload_1",
      atomRevision: 3,
      buildKey: "bk",
      companyId: "example.com",
      packages: [
        {
          id: "pkg1",
          atomId: "atom_reload_1",
          atomRevision: 3,
          formatId: "youtube_short",
          status: "draft",
          title: "Reload",
          durationSeconds: 15,
          aspectRatio: "9:16",
          hook: "Hook",
          voiceoverPrompt: "VO",
          imagePrompt: "IMG",
          script: "Script",
          scenes: [
            {
              id: "scene_1",
              order: 0,
              durationSeconds: 5,
              narration: "Hello",
              visualPrompt: "Still",
              assetType: "image",
              onScreenText: "NEW",
              composedVideo: {
                status: "stale",
                assetUrl: "https://cdn.example.com/old.mp4",
                onScreenTextUsed: "OLD",
              },
              voice: {
                status: "succeeded",
                assetUrl: "https://cdn.example.com/v.mp3",
                durationSeconds: 2,
                scriptUsed: "Hello",
              },
            },
            {
              id: "scene_2",
              order: 1,
              durationSeconds: 5,
              narration: "World",
              visualPrompt: "Still two",
              assetType: "image",
              onScreenText: "WORLD",
            },
          ],
          audienceAction: "Follow",
          evidenceRefs: [],
          unresolvedResearch: [],
          warnings: [],
          generation: {
            templateVersion: "t",
            adapterVersion: "a",
            idempotencyKey: "k",
          },
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveProductionBundle(bundle);
    const loaded = loadProductionBundle("atom_reload_1", 3);
    assert.ok(loaded);
    const scene = loaded!.packages[0]!.scenes[0]!;
    assert.equal(scene.composedVideo?.status, "stale");
    assert.equal(
      scene.composedVideo?.assetUrl,
      "https://cdn.example.com/old.mp4"
    );
    assert.equal(scene.voice?.status, "succeeded");
  });
});

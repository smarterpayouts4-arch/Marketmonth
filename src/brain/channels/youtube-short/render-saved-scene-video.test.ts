import assert from "node:assert/strict";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { afterEach, before, describe, it } from "node:test";

import { approveAtom, deriveLimitations, lockAtom } from "@/brain/atom";
import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";
import {
  loadProductionBundle,
  saveProductionBundle,
} from "@/brain/content-studio/bundle-store";
import type { ContentProductionBundle } from "@/brain/content-studio/schemas/format-package";
import { runCoreContentBrain } from "@/brain/pipeline";
import { VEO_VIDEO_MODEL_DEFAULT } from "@/brain/render";
import { createAtomRepository } from "@/brain/store";
import { runtimeRoot } from "@/brain/store/paths";

import {
  clearYouTubeShortSavedSceneVideo,
  patchYouTubeShortDurableEdits,
  produceYouTubeShortFormatPackage,
  renderYouTubeShortSavedSceneVideo,
} from "./youtube-short-service";

const sampleSelected = {
  masterTopic: {
    id: "master_test",
    source: "automatic" as const,
    punchline: "How to make clearer marketing decisions with Zynava",
    subheading: "Umbrella",
    rationale: "From fixture",
    evidenceIds: [] as string[],
    confidence: "high" as const,
    safety: { status: "safe" as const, reasons: [] as string[] },
  },
  variation: {
    id: "var_decision",
    angle: "decision_guide" as const,
    punchline: "Decide what to say this month without drowning in ideas",
    subheading: "Decision support",
    brief: "Help operators pick one direction first.",
    audienceProblem: "Too many disconnected content ideas",
    strategicPurpose: "Position as decision partner",
    evidenceIds: [] as string[],
    assumptionIds: [] as string[],
    confidence: "high" as const,
    safety: { status: "safe" as const, reasons: [] as string[] },
  },
};

async function lockedAtomFromFixture() {
  const text = await import("node:fs").then((fs) =>
    fs.readFileSync(
      path.join(process.cwd(), "data/companies/zynava.com/approved.csv"),
      "utf8"
    )
  );
  const context = parseFixtureCsv(text);
  assert.ok(context);
  const brain = await runCoreContentBrain({
    context,
    preferLlm: false,
    selected: sampleSelected,
  });
  assert.equal(brain.ok, true);
  if (!brain.ok) throw new Error("brain failed");
  const limitations = deriveLimitations(brain.atom, null);
  const approved = approveAtom(brain.atom, {
    limitationsAcknowledgement:
      brain.atom.buildStatus === "limited"
        ? {
            acknowledgedAt: new Date().toISOString(),
            limitations:
              limitations.length > 0
                ? limitations
                : ["limited atom acknowledged for video test"],
          }
        : undefined,
  });
  assert.equal(approved.ok, true);
  if (!approved.ok) throw new Error("approve failed");
  const locked = lockAtom(approved.atom);
  assert.equal(locked.ok, true);
  if (!locked.ok) throw new Error("lock failed");
  return locked.atom;
}

describe("renderYouTubeShortSavedSceneVideo (Checkpoint D)", () => {
  const bundlesDir = path.join(runtimeRoot(), "production-bundles");
  const prevRender = process.env.MM_VIDEO_RENDER;
  const prevProvider = process.env.MM_VIDEO_PROVIDER;
  const prevModel = process.env.MM_VIDEO_MODEL;

  before(() => {
    mkdirSync(bundlesDir, { recursive: true });
  });

  afterEach(() => {
    if (prevRender === undefined) delete process.env.MM_VIDEO_RENDER;
    else process.env.MM_VIDEO_RENDER = prevRender;
    if (prevProvider === undefined) delete process.env.MM_VIDEO_PROVIDER;
    else process.env.MM_VIDEO_PROVIDER = prevProvider;
    if (prevModel === undefined) delete process.env.MM_VIDEO_MODEL;
    else process.env.MM_VIDEO_MODEL = prevModel;
  });

  async function seed(
    visualPrompt: string,
    motionPrompt = "She opens the bottle, lifts the glass, drinks, and settles."
  ) {
    const base = await lockedAtomFromFixture();
    const atom = {
      ...base,
      atom_id: `atom_video_${Date.now().toString(36)}`,
      atom_version: 1,
    };
    const repo = createAtomRepository();
    const stored = await repo.save(atom, {
      validationReport: null,
      buildKey: `test|${atom.atom_id}|video`,
    });
    const revision = stored.record_revision;
    const produced = await produceYouTubeShortFormatPackage({
      atom: stored.atom,
      validationReport: null,
      atomRevision: revision,
    });
    assert.equal(produced.ok, true);
    if (!produced.ok) throw new Error("produce failed");

    const sceneId = produced.package.scenes[0]!.id;
    const imageUrl = "https://ik.imagekit.io/test/scene-still-video.jpg";
    const withImage: ContentProductionBundle = {
      atomId: atom.atom_id,
      atomRevision: revision,
      buildKey: stored.build_key ?? `test|${atom.atom_id}|${revision}`,
      companyId: stored.company_id,
      packages: [
        {
          ...produced.package,
          scenes: produced.package.scenes.map((s) =>
            s.id === sceneId
              ? {
                  ...s,
                  render: {
                    status: "succeeded" as const,
                    assetUrl: imageUrl,
                    assetRef: "imagekit://still-video",
                    updatedAt: new Date().toISOString(),
                  },
                  voice: {
                    status: "succeeded" as const,
                    assetUrl: "https://ik.imagekit.io/test/keep-voice.wav",
                    assetRef: "imagekit://keep-voice",
                    mimeType: "audio/wav",
                    updatedAt: new Date().toISOString(),
                  },
                }
              : s
          ),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveProductionBundle(withImage);

    const patched = await patchYouTubeShortDurableEdits({
      atomId: atom.atom_id,
      companyIdHint: stored.company_id,
      edits: {
        scenes: {
          [sceneId]: {
            narration: "DO NOT USE AS VIDEO PROMPT narration",
            visualPrompt,
            motionPrompt,
            onScreenText: "DO NOT USE AS VIDEO PROMPT on screen",
            assetType: "video",
          },
        },
      },
    });
    assert.equal(patched.ok, true);
    if (patched.ok !== true) throw new Error("patch failed");

    return {
      atomId: atom.atom_id,
      companyId: stored.company_id,
      revision,
      sceneId,
      imageUrl,
      visualPrompt,
      motionPrompt,
    };
  }

  function cleanup(atomId: string, revision: number) {
    try {
      rmSync(
        path.join(
          bundlesDir,
          `${atomId.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100)}_r${revision}.json`
        ),
        { force: true }
      );
    } catch {
      /* ignore */
    }
  }

  it("uses durable motionPrompt + still; persists video; leaves render and voice", async () => {
    const {
      atomId,
      companyId,
      revision,
      sceneId,
      imageUrl,
      motionPrompt,
    } = await seed("Slow push-in on the magnesium bottle, soft daylight");
    try {
      process.env.MM_VIDEO_RENDER = "live";
      process.env.MM_VIDEO_PROVIDER = "veo";
      delete process.env.MM_VIDEO_MODEL;

      let promptSeen = "";
      let stillUrlSeen = "";
      const outcome = await renderYouTubeShortSavedSceneVideo(
        {
          atomId,
          sceneId,
          formatId: "youtube_short",
          companyIdHint: companyId,
        },
        {
          fetchStill: async (url) => {
            stillUrlSeen = url;
            return {
              bytes: Buffer.from("still-png"),
              mimeType: "image/png",
            };
          },
          generateVideo: async (input, cfg) => {
            promptSeen = input.prompt;
            assert.match(input.prompt, new RegExp(motionPrompt.slice(0, 20)));
            assert.doesNotMatch(input.prompt, /DO NOT USE AS VIDEO PROMPT/);
            assert.ok(input.imageBytes.equals(Buffer.from("still-png")));
            assert.equal(cfg.video_provider, "veo");
            assert.equal(cfg.video_model, VEO_VIDEO_MODEL_DEFAULT);
            assert.equal(cfg.resolution, "720p");
            return {
              status: "generated",
              provider: "veo",
              model: cfg.video_model,
              asset_ref: "memory://video/1",
              prompt_used: input.prompt,
              resolution: cfg.resolution,
              aspectRatio: cfg.aspectRatio,
              bytes: Buffer.from("fake-mp4"),
              mimeType: "video/mp4",
              durationSeconds: 4,
            };
          },
          uploadSceneVideo: async (input) => {
            assert.equal(input.atomId, atomId);
            assert.equal(input.sceneId, sceneId);
            assert.equal(input.mimeType, "video/mp4");
            return {
              assetRef: "imagekit://video1",
              assetUrl: "https://ik.imagekit.io/test/video1.mp4",
              storageProvider: "imagekit",
              storageFileId: "video1",
              mimeType: input.mimeType,
              bytes: input.bytes.length,
            };
          },
        }
      );

      assert.equal(outcome.ok, true);
      if (outcome.ok !== true) throw new Error("video render failed");
      assert.match(promptSeen, new RegExp(motionPrompt.slice(0, 20)));
      assert.equal(stillUrlSeen, imageUrl);
      assert.equal(outcome.video.status, "succeeded");
      assert.equal(outcome.video.provider, "veo");
      assert.equal(outcome.video.model, VEO_VIDEO_MODEL_DEFAULT);
      assert.match(
        outcome.video.promptUsed ?? "",
        new RegExp(motionPrompt.slice(0, 20))
      );
      assert.equal(
        outcome.video.assetUrl,
        "https://ik.imagekit.io/test/video1.mp4"
      );
      assert.equal(outcome.video.sourceImageUrl, imageUrl);

      const reloaded = loadProductionBundle(atomId, revision);
      assert.ok(reloaded);
      const short = reloaded!.packages.find((p) => p.formatId === "youtube_short");
      assert.ok(short && short.formatId === "youtube_short");
      const scene = short!.scenes.find((s) => s.id === sceneId);
      assert.equal(scene?.video?.assetUrl, outcome.video.assetUrl);
      assert.equal(scene?.render?.assetUrl, imageUrl);
      assert.equal(
        scene?.voice?.assetUrl,
        "https://ik.imagekit.io/test/keep-voice.wav"
      );
    } finally {
      cleanup(atomId, revision);
    }
  });

  it("rejects empty motionPrompt without calling Veo", async () => {
    const seeded = await seed("Plate still", "");
    try {
      process.env.MM_VIDEO_RENDER = "live";
      process.env.MM_VIDEO_PROVIDER = "veo";
      let called = false;
      const outcome = await renderYouTubeShortSavedSceneVideo(
        {
          atomId: seeded.atomId,
          sceneId: seeded.sceneId,
          companyIdHint: seeded.companyId,
        },
        {
          generateVideo: async () => {
            called = true;
            throw new Error("should not run");
          },
        }
      );
      assert.equal(outcome.ok, false);
      if (outcome.ok) throw new Error("expected failure");
      assert.equal(outcome.code, "short_video.empty_motion_prompt");
      assert.equal(called, false);
    } finally {
      cleanup(seeded.atomId, seeded.revision);
    }
  });

  it("rejects missing still without calling Veo", async () => {
    const seeded = await seed("Camera orbit around the product");
    const { atomId, companyId, revision, sceneId } = seeded;
    try {
      const bundle = loadProductionBundle(atomId, revision);
      assert.ok(bundle);
      const short = bundle!.packages.find(
        (p) => p.formatId === "youtube_short"
      );
      assert.ok(short && short.formatId === "youtube_short");
      const stripped: ContentProductionBundle = {
        ...bundle!,
        packages: bundle!.packages.map((p) =>
          p.formatId === "youtube_short"
            ? {
                ...short!,
                scenes: short!.scenes.map((s) => {
                  if (s.id !== sceneId) return s;
                  const rest = { ...s };
                  delete rest.render;
                  return rest;
                }),
              }
            : p
        ),
      };
      await saveProductionBundle(stripped);

      let generateCalls = 0;
      const outcome = await renderYouTubeShortSavedSceneVideo(
        { atomId, sceneId, companyIdHint: companyId },
        {
          generateVideo: async () => {
            generateCalls += 1;
            throw new Error("should not generate");
          },
        }
      );
      assert.equal(outcome.ok, false);
      if (outcome.ok) throw new Error("expected failure");
      assert.equal(outcome.code, "short_video.missing_still");
      assert.equal(generateCalls, 0);
    } finally {
      cleanup(atomId, revision);
    }
  });

  it("stubs honestly when not live", async () => {
    const { atomId, companyId, revision, sceneId, imageUrl } = await seed(
      "Subtle parallax on the still"
    );
    try {
      delete process.env.MM_VIDEO_RENDER;
      delete process.env.MM_VIDEO_PROVIDER;

      const outcome = await renderYouTubeShortSavedSceneVideo(
        { atomId, sceneId, companyIdHint: companyId },
        {
          fetchStill: async () => ({
            bytes: Buffer.from("still"),
            mimeType: "image/png",
          }),
        }
      );
      assert.equal(outcome.ok, true);
      if (outcome.ok !== true) throw new Error("stub failed");
      assert.equal(outcome.video.status, "stubbed");
      assert.equal(outcome.video.assetUrl, undefined);
      assert.match(outcome.message, /stubbed/i);

      const reloaded = loadProductionBundle(atomId, revision);
      const scene = reloaded?.packages
        .find((p) => p.formatId === "youtube_short")
        ?.scenes.find((s) => s.id === sceneId);
      assert.equal(scene?.video?.status, "stubbed");
      assert.equal(scene?.render?.assetUrl, imageUrl);
    } finally {
      cleanup(atomId, revision);
    }
  });

  it("clear omits scene.video and best-effort deletes storage", async () => {
    const { atomId, companyId, revision, sceneId } = await seed(
      "Gentle rack focus"
    );
    try {
      process.env.MM_VIDEO_RENDER = "live";
      process.env.MM_VIDEO_PROVIDER = "veo";

      const generated = await renderYouTubeShortSavedSceneVideo(
        { atomId, sceneId, companyIdHint: companyId },
        {
          fetchStill: async () => ({
            bytes: Buffer.from("still"),
            mimeType: "image/png",
          }),
          generateVideo: async (input, cfg) => ({
            status: "generated",
            provider: "veo",
            model: cfg.video_model,
            asset_ref: "m",
            prompt_used: input.prompt,
            resolution: cfg.resolution,
            aspectRatio: cfg.aspectRatio,
            bytes: Buffer.from("mp4"),
            mimeType: "video/mp4",
            durationSeconds: 4,
          }),
          uploadSceneVideo: async () => ({
            assetRef: "imagekit://vdel",
            assetUrl: "https://ik.imagekit.io/test/vdel.mp4",
            storageProvider: "imagekit",
            storageFileId: "vdel",
            mimeType: "video/mp4",
            bytes: 3,
          }),
        }
      );
      assert.equal(generated.ok, true);

      let deletedId = "";
      const cleared = await clearYouTubeShortSavedSceneVideo(
        { atomId, sceneId, companyIdHint: companyId },
        {
          deleteSceneVideo: async (id) => {
            deletedId = id;
            return { ok: true };
          },
        }
      );
      assert.equal(cleared.ok, true);
      if (cleared.ok !== true) throw new Error("clear failed");
      assert.equal(deletedId, "vdel");
      assert.equal(cleared.storageDeleteAttempted, true);
      assert.equal(cleared.storageDeleteOk, true);

      const scene = loadProductionBundle(atomId, revision)
        ?.packages.find((p) => p.formatId === "youtube_short")
        ?.scenes.find((s) => s.id === sceneId);
      assert.equal(scene?.video, undefined);
      assert.ok(scene?.render?.assetUrl);
      assert.ok(scene?.voice?.assetUrl);
    } finally {
      cleanup(atomId, revision);
    }
  });
});

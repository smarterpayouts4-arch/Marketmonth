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
import { createAtomRepository } from "@/brain/store";
import { runtimeRoot } from "@/brain/store/paths";

import {
  patchYouTubeShortDurableEdits,
  produceYouTubeShortFormatPackage,
  renderYouTubeShortSavedSceneComposedVideo,
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
                : ["limited atom acknowledged for compose test"],
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

describe("renderYouTubeShortSavedSceneComposedVideo (Checkpoint D)", () => {
  const bundlesDir = path.join(runtimeRoot(), "production-bundles");
  const prevCompose = process.env.MM_SCENE_COMPOSE_RENDER;
  const prevCompositor = process.env.MM_SCENE_COMPOSITOR;

  before(() => {
    mkdirSync(bundlesDir, { recursive: true });
  });

  afterEach(() => {
    if (prevCompose === undefined) delete process.env.MM_SCENE_COMPOSE_RENDER;
    else process.env.MM_SCENE_COMPOSE_RENDER = prevCompose;
    if (prevCompositor === undefined) delete process.env.MM_SCENE_COMPOSITOR;
    else process.env.MM_SCENE_COMPOSITOR = prevCompositor;
  });

  async function seed(opts: {
    narration: string;
    scriptUsed?: string;
    withImage?: boolean;
    withVoice?: boolean;
    voiceDuration?: number;
    onScreenText?: string;
    withVeo?: boolean;
    assetType?: "image" | "video";
  }) {
    const base = await lockedAtomFromFixture();
    const atom = {
      ...base,
      atom_id: `atom_compose_${Date.now().toString(36)}`,
      atom_version: 1,
    };
    const repo = createAtomRepository();
    const stored = await repo.save(atom, {
      validationReport: null,
      buildKey: `test|${atom.atom_id}|compose`,
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
    const imageUrl = "https://ik.imagekit.io/test/compose-still.jpg";
    const voiceUrl = "https://ik.imagekit.io/test/compose-voice.wav";
    const veoUrl = "https://ik.imagekit.io/test/compose-veo.mp4";
    const onScreenText =
      opts.onScreenText ?? "Why is\nmagnesium\nattracting attention?";
    const scriptUsed = opts.scriptUsed ?? opts.narration;

    const withMedia: ContentProductionBundle = {
      atomId: atom.atom_id,
      atomRevision: revision,
      buildKey: stored.build_key ?? `test|${atom.atom_id}|${revision}`,
      companyId: stored.company_id,
      packages: [
        {
          ...produced.package,
          scenes: produced.package.scenes.map((s) => {
            if (s.id !== sceneId) return s;
            return {
              ...s,
              ...(opts.withImage !== false
                ? {
                    render: {
                      status: "succeeded" as const,
                      assetUrl: imageUrl,
                      assetRef: "imagekit://still",
                      updatedAt: new Date().toISOString(),
                    },
                  }
                : {}),
              ...(opts.withVoice !== false
                ? {
                    voice: {
                      status: "succeeded" as const,
                      provider: "gemini",
                      model: "gemini-2.5-flash-preview-tts",
                      assetUrl: voiceUrl,
                      assetRef: "imagekit://voice",
                      mimeType: "audio/wav",
                      durationSeconds: opts.voiceDuration ?? 3.25,
                      scriptUsed,
                      storageProvider: "imagekit",
                      storageFileId: "voice1",
                      updatedAt: new Date().toISOString(),
                    },
                  }
                : {}),
              ...(opts.withVeo
                ? {
                    video: {
                      status: "succeeded" as const,
                      provider: "veo",
                      assetUrl: veoUrl,
                      mimeType: "video/mp4",
                      updatedAt: new Date().toISOString(),
                    },
                  }
                : {}),
            };
          }),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveProductionBundle(withMedia);

    const patched = await patchYouTubeShortDurableEdits({
      atomId: atom.atom_id,
      companyIdHint: stored.company_id,
      edits: {
        scenes: {
          [sceneId]: {
            narration: opts.narration,
            visualPrompt: "Plate prompt must stay",
            motionPrompt:
              opts.assetType === "video"
                ? "She opens the bottle, lifts the glass, drinks, and settles."
                : undefined,
            onScreenText,
            assetType: opts.assetType ?? "image",
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
      voiceUrl,
      veoUrl,
      onScreenText,
      narration: opts.narration,
      scriptUsed,
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

  it("rejects when narration differs from voice.scriptUsed", async () => {
    const seeded = await seed({
      narration: "New narration after drift",
      scriptUsed: "Original spoken script",
    });
    try {
      const outcome = await renderYouTubeShortSavedSceneComposedVideo({
        atomId: seeded.atomId,
        sceneId: seeded.sceneId,
        companyIdHint: seeded.companyId,
      });
      assert.equal(outcome.ok, false);
      if (outcome.ok) throw new Error("expected failure");
      assert.equal(outcome.code, "short_compose.narration_drift");
      assert.match(outcome.error, /Regenerate Voice/i);
    } finally {
      cleanup(seeded.atomId, seeded.revision);
    }
  });

  it("rejects without a succeeded image", async () => {
    const seeded = await seed({
      narration: "Same line",
      withImage: false,
    });
    try {
      const outcome = await renderYouTubeShortSavedSceneComposedVideo({
        atomId: seeded.atomId,
        sceneId: seeded.sceneId,
        companyIdHint: seeded.companyId,
      });
      assert.equal(outcome.ok, false);
      if (outcome.ok) throw new Error("expected failure");
      assert.equal(outcome.code, "short_compose.missing_still");
    } finally {
      cleanup(seeded.atomId, seeded.revision);
    }
  });

  it("rejects without succeeded voice or durationSeconds", async () => {
    const seeded = await seed({
      narration: "Same line",
      withVoice: false,
    });
    try {
      const outcome = await renderYouTubeShortSavedSceneComposedVideo({
        atomId: seeded.atomId,
        sceneId: seeded.sceneId,
        companyIdHint: seeded.companyId,
      });
      assert.equal(outcome.ok, false);
      if (outcome.ok) throw new Error("expected failure");
      assert.equal(outcome.code, "short_compose.missing_voice");
    } finally {
      cleanup(seeded.atomId, seeded.revision);
    }
  });

  it("stub mode does not claim a real MP4 URL", async () => {
    const seeded = await seed({ narration: "Same spoken line" });
    try {
      delete process.env.MM_SCENE_COMPOSE_RENDER;
      const outcome = await renderYouTubeShortSavedSceneComposedVideo({
        atomId: seeded.atomId,
        sceneId: seeded.sceneId,
        companyIdHint: seeded.companyId,
      });
      assert.equal(outcome.ok, true);
      if (!outcome.ok) throw new Error("expected stub ok");
      assert.equal(outcome.composedVideo.status, "stubbed");
      assert.equal(outcome.composedVideo.assetUrl, undefined);
      assert.match(outcome.message, /stubbed/i);
    } finally {
      cleanup(seeded.atomId, seeded.revision);
    }
  });

  it("live mode with assetType video selects motion visual from scene.video", async () => {
    const seeded = await seed({
      narration: "Same spoken line",
      voiceDuration: 8.49,
      withVeo: true,
      assetType: "video",
    });
    try {
      process.env.MM_SCENE_COMPOSE_RENDER = "live";
      process.env.MM_SCENE_COMPOSITOR = "ffmpeg";

      let seenKind: string | null = null;
      let seenUrl: string | null = null;
      let seenDuration: number | null = null;

      const outcome = await renderYouTubeShortSavedSceneComposedVideo(
        {
          atomId: seeded.atomId,
          sceneId: seeded.sceneId,
          companyIdHint: seeded.companyId,
        },
        {
          composeSceneVideo: async (req) => {
            seenKind = req.visual.kind;
            seenUrl = req.visual.url;
            seenDuration = req.durationSeconds;
            assert.equal(req.visual.kind, "motion");
            assert.equal(req.visual.url, seeded.veoUrl);
            assert.equal(req.durationSeconds, 8.49);
            return {
              status: "generated",
              provider: "local",
              compositor: "ffmpeg",
              bytes: Buffer.from("fake-mp4-motion"),
              mimeType: "video/mp4",
              width: 1080,
              height: 1920,
              durationSeconds: 8.49,
              durationVerified: true,
            };
          },
          uploadComposedVideo: async () => ({
            assetRef: "imagekit://composed-motion",
            assetUrl: "https://ik.imagekit.io/test/composed-motion.mp4",
            storageProvider: "imagekit" as const,
            storageFileId: "composed-motion",
            mimeType: "video/mp4",
            bytes: 14,
          }),
        }
      );

      assert.equal(outcome.ok, true);
      if (!outcome.ok) throw new Error("compose failed");
      assert.equal(seenKind, "motion");
      assert.equal(seenUrl, seeded.veoUrl);
      assert.equal(seenDuration, 8.49);
      assert.equal(outcome.composedVideo.status, "succeeded");
      assert.equal(outcome.composedVideo.sourceVisualUrl, seeded.veoUrl);
      assert.equal(outcome.composedVideo.sourceImageUrl, seeded.imageUrl);

      const reloaded = loadProductionBundle(seeded.atomId, seeded.revision);
      const short = reloaded?.packages.find(
        (p) => p.formatId === "youtube_short"
      );
      const scene = short?.scenes.find((s) => s.id === seeded.sceneId);
      assert.equal(scene?.video?.assetUrl, seeded.veoUrl);
      assert.equal(
        scene?.composedVideo?.assetUrl,
        "https://ik.imagekit.io/test/composed-motion.mp4"
      );
      assert.equal(scene?.composedVideo?.sourceVisualUrl, seeded.veoUrl);
      assert.notEqual(scene?.composedVideo?.assetUrl, scene?.video?.assetUrl);
    } finally {
      cleanup(seeded.atomId, seeded.revision);
    }
  });

  it("rejects video assetType without succeeded scene.video", async () => {
    const seeded = await seed({
      narration: "Same spoken line",
      assetType: "video",
      withVeo: false,
    });
    try {
      process.env.MM_SCENE_COMPOSE_RENDER = "live";
      const outcome = await renderYouTubeShortSavedSceneComposedVideo({
        atomId: seeded.atomId,
        sceneId: seeded.sceneId,
        companyIdHint: seeded.companyId,
      });
      assert.equal(outcome.ok, false);
      if (outcome.ok) throw new Error("expected failure");
      assert.equal(outcome.code, "short_compose.missing_motion");
    } finally {
      cleanup(seeded.atomId, seeded.revision);
    }
  });

  it("live mode uses voice.durationSeconds and persists composedVideo without mutating inputs", async () => {
    const seeded = await seed({
      narration: "Same spoken line",
      voiceDuration: 4.5,
      withVeo: true,
    });
    try {
      process.env.MM_SCENE_COMPOSE_RENDER = "live";
      process.env.MM_SCENE_COMPOSITOR = "ffmpeg";

      let seenDuration: number | null = null;
      let seenImage: string | null = null;
      let seenAudio: string | null = null;

      const outcome = await renderYouTubeShortSavedSceneComposedVideo(
        {
          atomId: seeded.atomId,
          sceneId: seeded.sceneId,
          companyIdHint: seeded.companyId,
        },
        {
          composeSceneVideo: async (req) => {
            seenDuration = req.durationSeconds;
            seenImage = req.visual.url;
            seenAudio = req.audioUrl;
            assert.equal(req.visual.kind, "still");
            assert.equal(req.durationSeconds, 4.5);
            assert.notEqual(req.durationSeconds, 5);
            assert.equal(req.titleOverlay.showSceneBadge, false);
            assert.equal(req.titleOverlay.sceneLabel ?? "", "");
            assert.ok(req.titleOverlay.titleLines.length > 0);
            assert.doesNotMatch(
              req.titleOverlay.titleLines.join("\n"),
              /^Scene \d+$/m
            );
            return {
              status: "generated",
              provider: "local",
              compositor: "ffmpeg",
              bytes: Buffer.from("fake-mp4"),
              mimeType: "video/mp4",
              width: 1080,
              height: 1920,
              durationSeconds: 4.5,
              durationVerified: true,
            };
          },
          uploadComposedVideo: async () => ({
            assetRef: "imagekit://composed1",
            assetUrl: "https://ik.imagekit.io/test/composed1.mp4",
            storageProvider: "imagekit" as const,
            storageFileId: "composed1",
            mimeType: "video/mp4",
            bytes: 8,
          }),
        }
      );

      assert.equal(outcome.ok, true);
      if (!outcome.ok) throw new Error("compose failed");
      assert.equal(seenDuration, 4.5);
      assert.equal(seenImage, seeded.imageUrl);
      assert.equal(seenAudio, seeded.voiceUrl);
      assert.equal(outcome.composedVideo.status, "succeeded");
      assert.equal(
        outcome.composedVideo.assetUrl,
        "https://ik.imagekit.io/test/composed1.mp4"
      );
      assert.equal(outcome.composedVideo.durationSeconds, 4.5);

      const reloaded = loadProductionBundle(seeded.atomId, seeded.revision);
      assert.ok(reloaded);
      const short = reloaded!.packages.find((p) => p.formatId === "youtube_short");
      assert.ok(short && short.formatId === "youtube_short");
      const scene = short!.scenes.find((s) => s.id === seeded.sceneId);
      assert.equal(scene?.composedVideo?.status, "succeeded");
      assert.equal(scene?.composedVideo?.assetUrl, outcome.composedVideo.assetUrl);
      assert.equal(scene?.render?.assetUrl, seeded.imageUrl);
      assert.equal(scene?.voice?.assetUrl, seeded.voiceUrl);
      assert.equal(scene?.onScreenText, seeded.onScreenText);
      assert.equal(scene?.video?.assetUrl, seeded.veoUrl);
      assert.equal(
        reloaded!.packages.filter((p) => p.formatId === "youtube_video").length,
        0
      );
    } finally {
      cleanup(seeded.atomId, seeded.revision);
    }
  });

  it("live mode requires available FFmpeg when compositor runs without inject", async () => {
    const seeded = await seed({ narration: "Same spoken line" });
    try {
      process.env.MM_SCENE_COMPOSE_RENDER = "live";
      process.env.MM_SCENE_COMPOSITOR = "ffmpeg";
      process.env.MM_FFMPEG_PATH = path.join(
        process.cwd(),
        "__missing_ffmpeg_binary__"
      );

      const outcome = await renderYouTubeShortSavedSceneComposedVideo({
        atomId: seeded.atomId,
        sceneId: seeded.sceneId,
        companyIdHint: seeded.companyId,
      });
      assert.equal(outcome.ok, false);
      if (outcome.ok) throw new Error("expected ffmpeg config failure");
      assert.equal(outcome.code, "short_compose.provider_failed");
      assert.match(outcome.error, /FFmpeg|MM_FFMPEG_PATH/i);
      assert.equal(outcome.composedVideo?.status, "failed");

      const reloaded = loadProductionBundle(seeded.atomId, seeded.revision);
      const short = reloaded?.packages.find((p) => p.formatId === "youtube_short");
      const scene = short?.scenes.find((s) => s.id === seeded.sceneId);
      assert.equal(scene?.composedVideo?.status, "failed");
      assert.equal(scene?.render?.assetUrl, seeded.imageUrl);
      assert.equal(scene?.voice?.assetUrl, seeded.voiceUrl);
    } finally {
      delete process.env.MM_FFMPEG_PATH;
      cleanup(seeded.atomId, seeded.revision);
    }
  });

  it("unsupported compositor fails clearly", async () => {
    const seeded = await seed({ narration: "Same spoken line" });
    try {
      process.env.MM_SCENE_COMPOSE_RENDER = "live";
      process.env.MM_SCENE_COMPOSITOR = "remotion";
      const outcome = await renderYouTubeShortSavedSceneComposedVideo({
        atomId: seeded.atomId,
        sceneId: seeded.sceneId,
        companyIdHint: seeded.companyId,
      });
      assert.equal(outcome.ok, false);
      if (outcome.ok) throw new Error("expected unsupported compositor");
      assert.match(outcome.error, /Unsupported MM_SCENE_COMPOSITOR/i);
      assert.equal(outcome.composedVideo?.status, "failed");
    } finally {
      cleanup(seeded.atomId, seeded.revision);
    }
  });
});

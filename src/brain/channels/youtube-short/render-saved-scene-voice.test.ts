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
  clearYouTubeShortSavedSceneVoice,
  patchYouTubeShortDurableEdits,
  produceYouTubeShortFormatPackage,
  renderYouTubeShortSavedSceneVoice,
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
                : ["limited atom acknowledged for voice test"],
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

describe("renderYouTubeShortSavedSceneVoice (Checkpoint C)", () => {
  const bundlesDir = path.join(runtimeRoot(), "production-bundles");
  const prevRender = process.env.MM_VOICE_RENDER;
  const prevProvider = process.env.MM_VOICE_PROVIDER;

  before(() => {
    mkdirSync(bundlesDir, { recursive: true });
  });

  afterEach(() => {
    if (prevRender === undefined) delete process.env.MM_VOICE_RENDER;
    else process.env.MM_VOICE_RENDER = prevRender;
    if (prevProvider === undefined) delete process.env.MM_VOICE_PROVIDER;
    else process.env.MM_VOICE_PROVIDER = prevProvider;
  });

  async function seed(narration: string) {
    const base = await lockedAtomFromFixture();
    const atom = {
      ...base,
      atom_id: `atom_voice_${Date.now().toString(36)}`,
      atom_version: 1,
    };
    const repo = createAtomRepository();
    const stored = await repo.save(atom, {
      validationReport: null,
      buildKey: `test|${atom.atom_id}|voice`,
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
    const imageUrl = "https://ik.imagekit.io/test/scene-still.jpg";
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
                    assetRef: "imagekit://still",
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
            narration,
            visualPrompt: "DO NOT USE AS VOICE SCRIPT visual plate",
            onScreenText: "DO NOT USE AS VOICE SCRIPT on screen",
            assetType: "image",
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
      narration,
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

  it("uses saved narration only; persists gemini voice; leaves image and video alone", async () => {
    const { atomId, companyId, revision, sceneId, imageUrl, narration } =
      await seed("Why is magnesium attracting so much attention?");
    try {
      process.env.MM_VOICE_RENDER = "live";
      process.env.MM_VOICE_PROVIDER = "gemini";

      let scriptSeen = "";
      let uploadCalls = 0;
      const outcome = await renderYouTubeShortSavedSceneVoice(
        {
          atomId,
          sceneId,
          formatId: "youtube_short",
          companyIdHint: companyId,
          // Client must not be able to override narration via this input shape.
        },
        {
          generateVoice: async (script, cfg) => {
            scriptSeen = script;
            assert.equal(script, narration);
            assert.doesNotMatch(script, /DO NOT USE AS VOICE SCRIPT/);
            assert.equal(cfg.voice_provider, "gemini");
            return {
              status: "generated",
              provider: "gemini",
              model: cfg.voice_model,
              asset_ref: "memory://voice/1",
              script_used: script,
              bytes: Buffer.from("RIFFWAV"),
              mimeType: "audio/wav",
              durationSeconds: 3.25,
            };
          },
          uploadSceneVoice: async (input) => {
            uploadCalls += 1;
            assert.equal(input.atomId, atomId);
            assert.equal(input.sceneId, sceneId);
            assert.equal(input.mimeType, "audio/wav");
            return {
              assetRef: "imagekit://voice1",
              assetUrl: "https://ik.imagekit.io/test/voice1.wav",
              storageProvider: "imagekit",
              storageFileId: "voice1",
              mimeType: input.mimeType,
              bytes: input.bytes.length,
            };
          },
        }
      );

      assert.equal(outcome.ok, true);
      if (outcome.ok !== true) throw new Error("voice render failed");
      assert.equal(scriptSeen, narration);
      assert.equal(uploadCalls, 1);
      assert.equal(outcome.voice.status, "succeeded");
      assert.equal(outcome.voice.provider, "gemini");
      assert.equal(outcome.voice.scriptUsed, narration);
      assert.equal(
        outcome.voice.assetUrl,
        "https://ik.imagekit.io/test/voice1.wav"
      );
      assert.equal(outcome.voice.mimeType, "audio/wav");
      assert.equal(outcome.voice.durationSeconds, 3.25);

      const reloaded = loadProductionBundle(atomId, revision);
      assert.ok(reloaded);
      const short = reloaded!.packages.find((p) => p.formatId === "youtube_short");
      assert.ok(short && short.formatId === "youtube_short");
      const scene = short!.scenes.find((s) => s.id === sceneId);
      assert.equal(scene?.voice?.assetUrl, outcome.voice.assetUrl);
      assert.equal(scene?.voice?.durationSeconds, 3.25);
      assert.equal(scene?.render?.assetUrl, imageUrl);
      // Voice path only mutates youtube_short; video packages are not introduced.
      assert.equal(
        reloaded!.packages.filter((p) => p.formatId === "youtube_video").length,
        0
      );
    } finally {
      cleanup(atomId, revision);
    }
  });

  it("regenerates after narration change; OST-only edit leaves voice", async () => {
    const seeded = await seed("Original narration line.");
    const { atomId, companyId, revision, sceneId, imageUrl } = seeded;
    try {
      process.env.MM_VOICE_RENDER = "live";
      process.env.MM_VOICE_PROVIDER = "gemini";

      const first = await renderYouTubeShortSavedSceneVoice(
        { atomId, sceneId, companyIdHint: companyId },
        {
          generateVoice: async (script) => ({
            status: "generated",
            provider: "gemini",
            model: "m",
            asset_ref: "m1",
            script_used: script,
            bytes: Buffer.from("a"),
            mimeType: "audio/wav",
            durationSeconds: 1,
          }),
          uploadSceneVoice: async () => ({
            assetRef: "imagekit://v1",
            assetUrl: "https://ik.imagekit.io/test/v1.wav",
            storageProvider: "imagekit",
            storageFileId: "v1",
            mimeType: "audio/wav",
            bytes: 1,
          }),
        }
      );
      assert.equal(first.ok, true);

      const ostOnly = await patchYouTubeShortDurableEdits({
        atomId,
        companyIdHint: companyId,
        edits: {
          scenes: {
            [sceneId]: { onScreenText: "New OST only" },
          },
        },
      });
      assert.equal(ostOnly.ok, true);
      if (!ostOnly.ok) throw new Error("ost patch failed");
      const afterOst = ostOnly.bundle.packages
        .find((p) => p.formatId === "youtube_short")
        ?.scenes.find((s) => s.id === sceneId);
      assert.equal(afterOst?.voice?.assetUrl, "https://ik.imagekit.io/test/v1.wav");
      assert.equal(afterOst?.render?.assetUrl, imageUrl);

      const narrPatch = await patchYouTubeShortDurableEdits({
        atomId,
        companyIdHint: companyId,
        edits: {
          scenes: {
            [sceneId]: {
              narration: "Original narration line. Extra words here.",
            },
          },
        },
      });
      assert.equal(narrPatch.ok, true);

      const second = await renderYouTubeShortSavedSceneVoice(
        { atomId, sceneId, companyIdHint: companyId },
        {
          generateVoice: async (script) => {
            assert.equal(script, "Original narration line. Extra words here.");
            return {
              status: "generated",
              provider: "gemini",
              model: "m",
              asset_ref: "m2",
              script_used: script,
              bytes: Buffer.from("bb"),
              mimeType: "audio/wav",
              durationSeconds: 2,
            };
          },
          uploadSceneVoice: async () => ({
            assetRef: "imagekit://v2",
            assetUrl: "https://ik.imagekit.io/test/v2.wav",
            storageProvider: "imagekit",
            storageFileId: "v2",
            mimeType: "audio/wav",
            bytes: 2,
          }),
        }
      );
      assert.equal(second.ok, true);
      if (second.ok !== true) throw new Error("regen failed");
      assert.equal(second.voice.assetUrl, "https://ik.imagekit.io/test/v2.wav");
      assert.equal(
        second.voice.scriptUsed,
        "Original narration line. Extra words here."
      );
      assert.equal(second.voice.durationSeconds, 2);

      const scene = second.bundle.packages
        .find((p) => p.formatId === "youtube_short")
        ?.scenes.find((s) => s.id === sceneId);
      assert.equal(scene?.render?.assetUrl, imageUrl);
    } finally {
      cleanup(atomId, revision);
    }
  });

  it("stub mode stays honest without CDN assetUrl", async () => {
    const { atomId, companyId, revision, sceneId } = await seed(
      "Stub narration."
    );
    try {
      delete process.env.MM_VOICE_RENDER;
      delete process.env.MM_VOICE_PROVIDER;
      const outcome = await renderYouTubeShortSavedSceneVoice({
        atomId,
        sceneId,
        companyIdHint: companyId,
      });
      assert.equal(outcome.ok, true);
      if (outcome.ok !== true) throw new Error("stub render failed");
      assert.equal(outcome.voice.status, "stubbed");
      assert.equal(outcome.voice.assetUrl, undefined);
      assert.match(outcome.message, /stubbed/i);
    } finally {
      cleanup(atomId, revision);
    }
  });

  it("clear removes voice and leaves image/narration/OST", async () => {
    const narration = "Clear me narration.";
    const { atomId, companyId, revision, sceneId, imageUrl } =
      await seed(narration);
    try {
      process.env.MM_VOICE_RENDER = "live";
      process.env.MM_VOICE_PROVIDER = "gemini";
      const deletedIds: string[] = [];

      const generated = await renderYouTubeShortSavedSceneVoice(
        { atomId, sceneId, companyIdHint: companyId },
        {
          generateVoice: async (script) => ({
            status: "generated",
            provider: "gemini",
            model: "m",
            asset_ref: "m1",
            script_used: script,
            bytes: Buffer.from("a"),
            mimeType: "audio/wav",
            durationSeconds: 1.5,
          }),
          uploadSceneVoice: async () => ({
            assetRef: "imagekit://clear-me",
            assetUrl: "https://ik.imagekit.io/test/clear-me.wav",
            storageProvider: "imagekit",
            storageFileId: "file_clear_me",
            mimeType: "audio/wav",
            bytes: 1,
          }),
        }
      );
      assert.equal(generated.ok, true);

      const cleared = await clearYouTubeShortSavedSceneVoice(
        { atomId, sceneId, companyIdHint: companyId },
        {
          deleteSceneVoice: async (id) => {
            deletedIds.push(id);
            return { ok: true };
          },
        }
      );
      assert.equal(cleared.ok, true);
      if (cleared.ok !== true) throw new Error("clear failed");
      assert.equal(cleared.storageDeleteAttempted, true);
      assert.equal(cleared.storageDeleteOk, true);
      assert.deepEqual(deletedIds, ["file_clear_me"]);

      const scene = cleared.bundle.packages
        .find((p) => p.formatId === "youtube_short")
        ?.scenes.find((s) => s.id === sceneId);
      assert.equal(scene?.voice, undefined);
      assert.equal(scene?.render?.assetUrl, imageUrl);
      assert.equal(scene?.narration, narration);
      assert.match(scene?.onScreenText ?? "", /DO NOT USE AS VOICE SCRIPT/);

      const reloaded = loadProductionBundle(atomId, revision);
      const reloadedScene = reloaded?.packages
        .find((p) => p.formatId === "youtube_short")
        ?.scenes.find((s) => s.id === sceneId);
      assert.equal(reloadedScene?.voice, undefined);
      assert.equal(reloadedScene?.render?.assetUrl, imageUrl);
    } finally {
      cleanup(atomId, revision);
    }
  });

  it("provider failure persists failed voice state", async () => {
    const { atomId, companyId, revision, sceneId } = await seed(
      "Will fail narration."
    );
    try {
      process.env.MM_VOICE_RENDER = "live";
      process.env.MM_VOICE_PROVIDER = "gemini";
      const outcome = await renderYouTubeShortSavedSceneVoice(
        { atomId, sceneId, companyIdHint: companyId },
        {
          generateVoice: async () => {
            throw new Error("Gemini TTS simulated failure");
          },
        }
      );
      assert.equal(outcome.ok, false);
      if (outcome.ok) throw new Error("expected failure");
      assert.equal(outcome.code, "short_voice.provider_failed");
      assert.equal(outcome.voice?.status, "failed");
      assert.match(outcome.voice?.error?.message ?? "", /simulated failure/i);

      const reloaded = loadProductionBundle(atomId, revision);
      const scene = reloaded?.packages
        .find((p) => p.formatId === "youtube_short")
        ?.scenes.find((s) => s.id === sceneId);
      assert.equal(scene?.voice?.status, "failed");
    } finally {
      cleanup(atomId, revision);
    }
  });
});

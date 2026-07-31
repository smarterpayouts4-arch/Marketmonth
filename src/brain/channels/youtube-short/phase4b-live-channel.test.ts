import assert from "node:assert/strict";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { approveAtom, deriveLimitations, lockAtom } from "@/brain/atom";
import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";
import { runCoreContentBrain } from "@/brain/pipeline";
import {
  loadProductionBundle,
  saveProductionBundle,
} from "@/brain/content-studio/bundle-store";
import type { ContentProductionBundle } from "@/brain/content-studio/schemas/format-package";
import { createDryRunAdapter, createLiveImageAdapter } from "@/brain/render";
import { createAtomRepository } from "@/brain/store";
import { runtimeRoot } from "@/brain/store/paths";

import {
  patchYouTubeShortDurableEdits,
  produceYouTubeShortFormatPackage,
  renderYouTubeShortSavedSceneImage,
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

function tinyPortraitPng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
}

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
                : ["limited atom acknowledged for phase4b test"],
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

describe("Phase 4B channel live image persistence", () => {
  const bundlesDir = path.join(runtimeRoot(), "production-bundles");

  before(() => {
    mkdirSync(bundlesDir, { recursive: true });
  });

  after(() => {
    /* per-test cleanup */
  });

  async function seed(visualPrompt = "Live still prompt for Scene 1.") {
    const base = await lockedAtomFromFixture();
    const atom = {
      ...base,
      atom_id: `atom_phase4b_${Date.now().toString(36)}`,
      atom_version: 1,
    };
    const repo = createAtomRepository();
    const stored = await repo.save(atom, {
      validationReport: null,
      buildKey: `test|${atom.atom_id}|phase4b`,
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
    const bundle: ContentProductionBundle = {
      atomId: atom.atom_id,
      atomRevision: revision,
      buildKey: stored.build_key ?? `test|${atom.atom_id}|${revision}`,
      companyId: stored.company_id,
      packages: [produced.package],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveProductionBundle(bundle);
    const patched = await patchYouTubeShortDurableEdits({
      atomId: atom.atom_id,
      companyIdHint: stored.company_id,
      edits: {
        scenes: { [sceneId]: { visualPrompt, assetType: "image" } },
      },
    });
    assert.equal(patched.ok, true);
    if (patched.ok !== true) throw new Error("patch failed");
    return {
      atomId: atom.atom_id,
      companyId: stored.company_id,
      revision,
      sceneId,
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

  function liveAdapter(url: string) {
    const png = tinyPortraitPng();
    return createLiveImageAdapter({
      gemini: {
        config: {
          apiKey: "test",
          model: "gemini-2.5-flash-image",
          provider: "gemini",
        },
        generateContent: async () => ({
          inlineData: { data: png.toString("base64"), mimeType: "image/png" },
        }),
      },
      imagekit: {
        config: {
          publicKey: "pub",
          privateKey: "priv",
          urlEndpoint: "https://ik.imagekit.io/demo",
        },
        upload: async () => ({
          fileId: `file_${url.slice(-6)}`,
          url,
          filePath: "/marketmonth/scene.png",
        }),
      },
    });
  }

  it("persists live succeeded asset fields and reloads them", async () => {
    const { atomId, companyId, revision, sceneId } = await seed(
      "L".repeat(3300)
    );
    try {
      const outcome = await renderYouTubeShortSavedSceneImage({
        atomId,
        sceneId,
        companyIdHint: companyId,
        adapter: liveAdapter(
          "https://ik.imagekit.io/demo/marketmonth/v1.png"
        ),
      });
      assert.equal(outcome.ok, true);
      if (outcome.ok !== true) throw new Error("render failed");
      assert.equal(outcome.render.status, "succeeded");
      assert.equal(outcome.render.mode, "live");
      assert.equal(
        outcome.render.assetUrl,
        "https://ik.imagekit.io/demo/marketmonth/v1.png"
      );
      assert.ok(outcome.shortRenderInput.effectivePrompt.includes("L".repeat(3300)));
      assert.doesNotMatch(JSON.stringify(outcome.render), /iVBORw0KGgo/);

      const reloaded = loadProductionBundle(atomId, revision);
      const scene = reloaded?.packages
        .find((p) => p.formatId === "youtube_short")
        ?.scenes.find((s) => s.id === sceneId);
      assert.equal(scene?.render?.status, "succeeded");
      assert.equal(
        scene?.render?.assetUrl,
        "https://ik.imagekit.io/demo/marketmonth/v1.png"
      );
    } finally {
      cleanup(atomId, revision);
    }
  });

  it("failed regeneration preserves previous successful asset", async () => {
    const { atomId, companyId, revision, sceneId } = await seed("regen path");
    try {
      const first = await renderYouTubeShortSavedSceneImage({
        atomId,
        sceneId,
        companyIdHint: companyId,
        adapter: liveAdapter(
          "https://ik.imagekit.io/demo/marketmonth/keep.png"
        ),
      });
      assert.equal(first.ok, true);

      const failAdapter = createLiveImageAdapter({
        gemini: {
          config: {
            apiKey: "test",
            model: "gemini-2.5-flash-image",
            provider: "gemini",
          },
          generateContent: async () => {
            throw new Error("429 rate limited");
          },
        },
        imagekit: {
          config: {
            publicKey: "pub",
            privateKey: "priv",
            urlEndpoint: "https://ik.imagekit.io/demo",
          },
        },
      });

      const second = await renderYouTubeShortSavedSceneImage({
        atomId,
        sceneId,
        companyIdHint: companyId,
        adapter: failAdapter,
      });
      assert.equal(second.ok, false);
      assert.equal(second.render?.status, "failed");
      assert.equal(
        second.render?.assetUrl,
        "https://ik.imagekit.io/demo/marketmonth/keep.png"
      );
      assert.equal(second.render?.attempt, 2);

      const reloaded = loadProductionBundle(atomId, revision);
      const scene = reloaded?.packages
        .find((p) => p.formatId === "youtube_short")
        ?.scenes.find((s) => s.id === sceneId);
      assert.equal(
        scene?.render?.assetUrl,
        "https://ik.imagekit.io/demo/marketmonth/keep.png"
      );
      assert.equal(scene?.render?.status, "failed");
    } finally {
      cleanup(atomId, revision);
    }
  });

  it("dry-run still available via injected adapter", async () => {
    const { atomId, companyId, revision, sceneId } = await seed("dry still");
    try {
      const outcome = await renderYouTubeShortSavedSceneImage({
        atomId,
        sceneId,
        companyIdHint: companyId,
        adapter: createDryRunAdapter(),
      });
      assert.equal(outcome.ok, true);
      if (outcome.ok !== true) throw new Error("dry-run failed");
      assert.equal(outcome.render.status, "dry_run_succeeded");
      assert.equal(outcome.render.assetUrl, undefined);
    } finally {
      cleanup(atomId, revision);
    }
  });
});

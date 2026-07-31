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
import { createDryRunAdapter } from "@/brain/render";
import { createAtomRepository } from "@/brain/store";
import { runtimeRoot } from "@/brain/store/paths";

import { hashSceneRenderSource } from "./compose-effective-image-prompt";
import { SHORT_RENDER_ERROR_CODES } from "./render-errors";
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
                : ["limited atom acknowledged for phase4a test"],
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

describe("Phase 4A renderYouTubeShortSavedSceneImage", () => {
  const bundlesDir = path.join(runtimeRoot(), "production-bundles");

  before(() => {
    mkdirSync(bundlesDir, { recursive: true });
  });

  after(() => {
    /* per-test cleanup */
  });

  async function seed(visualPrompt = "A clear vertical product still.") {
    const base = await lockedAtomFromFixture();
    const atom = {
      ...base,
      atom_id: `atom_phase4a_${Date.now().toString(36)}`,
      atom_version: 1,
    };
    const repo = createAtomRepository();
    const stored = await repo.save(atom, {
      validationReport: null,
      buildKey: `test|${atom.atom_id}|phase4a`,
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
        scenes: {
          [sceneId]: {
            visualPrompt,
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
      bundle: patched.bundle,
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

  it("loads saved scene, persists dry-run success, no fake assets", async () => {
    const longPrompt = "L".repeat(3300);
    const { atomId, companyId, revision, sceneId } = await seed(longPrompt);
    try {
      const outcome = await renderYouTubeShortSavedSceneImage({
        atomId,
        formatId: "youtube_short",
        sceneId,
        companyIdHint: companyId,
      });
      assert.equal(outcome.ok, true);
      if (outcome.ok !== true) throw new Error("render failed");

      assert.equal(outcome.render.status, "dry_run_succeeded");
      assert.equal(outcome.render.mode, "dry_run");
      assert.equal(outcome.render.provider, "dry-run");
      assert.ok(outcome.render.jobId);
      assert.ok(outcome.render.promptHash);
      assert.ok(outcome.render.sourceRevision);
      assert.equal(outcome.render.attempt, 1);
      assert.equal(outcome.render.assetRef, undefined);
      assert.equal(outcome.render.assetUrl, undefined);
      assert.equal(outcome.shortRenderInput.effectivePrompt.includes(longPrompt), true);
      assert.ok(outcome.shortRenderInput.effectivePrompt.length > 3300);

      const reloaded = loadProductionBundle(atomId, revision);
      assert.ok(reloaded);
      const short = reloaded!.packages.find((p) => p.formatId === "youtube_short");
      assert.ok(short && short.formatId === "youtube_short");
      const scene = short!.scenes.find((s) => s.id === sceneId);
      assert.equal(scene?.render?.status, "dry_run_succeeded");
      assert.equal(scene?.render?.assetUrl, undefined);
      assert.equal(scene?.render?.attempt, 1);
    } finally {
      cleanup(atomId, revision);
    }
  });

  it("rejects missing scene and empty visual prompt", async () => {
    const { atomId, companyId, revision, sceneId } = await seed("ok prompt");
    try {
      const missing = await renderYouTubeShortSavedSceneImage({
        atomId,
        sceneId: "scene_does_not_exist",
        companyIdHint: companyId,
      });
      assert.equal(missing.ok, false);
      if (!missing.ok) {
        assert.equal(missing.code, SHORT_RENDER_ERROR_CODES.SCENE_NOT_FOUND);
      }

      const cleared = await patchYouTubeShortDurableEdits({
        atomId,
        companyIdHint: companyId,
        edits: { scenes: { [sceneId]: { visualPrompt: "" } } },
      });
      assert.equal(cleared.ok, true);

      const empty = await renderYouTubeShortSavedSceneImage({
        atomId,
        sceneId,
        companyIdHint: companyId,
      });
      assert.equal(empty.ok, false);
      if (!empty.ok) {
        assert.equal(empty.code, SHORT_RENDER_ERROR_CODES.EMPTY_VISUAL_PROMPT);
      }
    } finally {
      cleanup(atomId, revision);
    }
  });

  it("persists normalized failure and increments attempt", async () => {
    const { atomId, companyId, revision, sceneId } = await seed("fail path");
    try {
      const failAdapter = createDryRunAdapter({
        failWith: {
          code: "test.forced",
          message: "forced dry-run failure",
          retryable: true,
        },
      });
      const first = await renderYouTubeShortSavedSceneImage({
        atomId,
        sceneId,
        companyIdHint: companyId,
        adapter: failAdapter,
      });
      assert.equal(first.ok, false);
      if (!first.ok) {
        assert.equal(first.render?.status, "failed");
        assert.equal(first.render?.attempt, 1);
        assert.equal(first.render?.error?.code, "test.forced");
      }

      const second = await renderYouTubeShortSavedSceneImage({
        atomId,
        sceneId,
        companyIdHint: companyId,
      });
      assert.equal(second.ok, true);
      if (second.ok) {
        assert.equal(second.render.attempt, 2);
        assert.equal(second.render.status, "dry_run_succeeded");
      }
    } finally {
      cleanup(atomId, revision);
    }
  });

  it("stale scene revision does not overwrite newer edits", async () => {
    const { atomId, companyId, revision, sceneId } = await seed("original prompt");
    try {
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });

      const slowAdapter = {
        id: "slow-dry-run",
        async render(request: Parameters<
          ReturnType<typeof createDryRunAdapter>["render"]
        >[0]) {
          await gate;
          return createDryRunAdapter().render(request);
        },
      };

      const pending = renderYouTubeShortSavedSceneImage({
        atomId,
        sceneId,
        companyIdHint: companyId,
        adapter: slowAdapter,
      });

      // Wait until queued/running persisted, then change the scene.
      let midStatus: string | undefined;
      for (let i = 0; i < 50; i++) {
        await new Promise((r) => setTimeout(r, 20));
        const mid = loadProductionBundle(atomId, revision);
        const midScene = mid?.packages
          .find((p) => p.formatId === "youtube_short")
          ?.scenes.find((s) => s.id === sceneId);
        midStatus = midScene?.render?.status;
        if (midStatus === "queued" || midStatus === "running") break;
      }
      assert.ok(
        midStatus === "queued" || midStatus === "running",
        `expected queued/running, got ${midStatus}`
      );

      const changed = await patchYouTubeShortDurableEdits({
        atomId,
        companyIdHint: companyId,
        edits: {
          scenes: {
            [sceneId]: { visualPrompt: "changed during render" },
          },
        },
      });
      assert.equal(changed.ok, true);

      release();
      const outcome = await pending;
      assert.equal(outcome.ok, false);
      if (!outcome.ok) {
        assert.equal(outcome.code, SHORT_RENDER_ERROR_CODES.STALE_SCENE_REVISION);
      }

      const final = loadProductionBundle(atomId, revision);
      const scene = final?.packages
        .find((p) => p.formatId === "youtube_short")
        ?.scenes.find((s) => s.id === sceneId);
      assert.equal(scene?.visualPrompt, "changed during render");
      assert.notEqual(
        scene?.render?.status,
        "dry_run_succeeded",
        "stale success must not attach as current"
      );
      const expectedRev = hashSceneRenderSource({
        visualPrompt: "changed during render",
        assetType: "image",
      });
      // Newer content revision is different from the in-flight one.
      assert.notEqual(scene?.render?.sourceRevision, expectedRev);
    } finally {
      cleanup(atomId, revision);
    }
  });

  it("API does not accept unsaved editor prompts — channel loads durable only", async () => {
    const { atomId, companyId, revision, sceneId } = await seed("durable only");
    try {
      const outcome = await renderYouTubeShortSavedSceneImage({
        atomId,
        sceneId,
        companyIdHint: companyId,
      });
      assert.equal(outcome.ok, true);
      if (outcome.ok !== true) throw new Error("render failed");
      assert.match(outcome.shortRenderInput.effectivePrompt, /durable only/);
      assert.doesNotMatch(
        outcome.shortRenderInput.effectivePrompt,
        /browser-only unsaved/
      );
    } finally {
      cleanup(atomId, revision);
    }
  });
});

import assert from "node:assert/strict";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { approveAtom, deriveLimitations, lockAtom } from "@/brain/atom";
import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";
import { runCoreContentBrain } from "@/brain/pipeline";
import { saveProductionBundle } from "@/brain/content-studio/bundle-store";
import type { ContentProductionBundle } from "@/brain/content-studio/schemas/format-package";
import { createAtomRepository } from "@/brain/store";
import { runtimeRoot } from "@/brain/store/paths";

import {
  applyDurableEditsToShortPackage,
  patchYouTubeShortDurableEdits,
  produceYouTubeShortFormatPackage,
  resetShortPackageToGeneratedBaseline,
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
                : ["limited atom acknowledged for phase3d test"],
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

describe("Phase 3D Manual scene setup + globalVisualStyle", () => {
  const bundlesDir = path.join(runtimeRoot(), "production-bundles");

  before(() => {
    mkdirSync(bundlesDir, { recursive: true });
  });

  after(() => {
    /* per-test cleanup */
  });

  async function seed() {
    const base = await lockedAtomFromFixture();
    const atom = {
      ...base,
      atom_id: `atom_phase3d_${Date.now().toString(36)}`,
      atom_version: 1,
    };
    const repo = createAtomRepository();
    const stored = await repo.save(atom, {
      validationReport: null,
      buildKey: `test|${atom.atom_id}|phase3d`,
    });
    const revision = stored.record_revision;
    const produced = await produceYouTubeShortFormatPackage({
      atom: stored.atom,
      validationReport: null,
      atomRevision: revision,
    });
    assert.equal(produced.ok, true);
    if (!produced.ok) throw new Error("produce failed");

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
    return {
      atomId: atom.atom_id,
      companyId: stored.company_id,
      revision,
      atom: stored.atom,
      package: produced.package,
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

  it("expands to nine scenes via sceneStructure; IDs and edits survive", async () => {
    const { atomId, companyId, revision, package: initial } = await seed();
    const priorIds = initial.scenes.map((s) => s.id);

    const scene1 = initial.scenes[0]!;
    const edited = await patchYouTubeShortDurableEdits({
      atomId,
      companyIdHint: companyId,
      edits: {
        scenes: {
          [scene1.id]: {
            visualPrompt: "Scene1 durable visual",
            narration: "Scene1 durable narration",
          },
        },
        globalVisualStyle:
          "Modern editorial realism, dark green and cream, 9:16",
      },
    });
    assert.equal(edited.ok, true);
    if (!edited.ok) return;

    const expanded = await patchYouTubeShortDurableEdits({
      atomId,
      companyIdHint: companyId,
      sceneStructure: { setCount: 9 },
    });
    assert.equal(expanded.ok, true);
    if (!expanded.ok) return;
    assert.equal(expanded.package.scenes.length, 9);
    const ids = expanded.package.scenes.map((s) => s.id);
    assert.equal(new Set(ids).size, 9);
    for (const id of priorIds) {
      assert.ok(ids.includes(id));
    }
    assert.equal(
      expanded.package.scenes.find((s) => s.id === scene1.id)?.visualPrompt,
      "Scene1 durable visual"
    );
    assert.equal(
      expanded.package.globalVisualStyle,
      "Modern editorial realism, dark green and cream, 9:16"
    );
    assert.equal(
      expanded.package.durableEdits?.globalVisualStyle,
      "Modern editorial realism, dark green and cream, 9:16"
    );

    const newScenes = expanded.package.scenes.filter(
      (s) => !priorIds.includes(s.id)
    );
    assert.equal(newScenes.length, 9 - priorIds.length);
    for (const scene of newScenes) {
      assert.match(scene.id, /^sm_[a-f0-9]{12}$/);
      assert.equal(scene.visualPrompt, "");
      assert.equal(scene.narration, "");
      assert.equal(scene.assetType, "image");
    }

    cleanup(atomId, revision);
  });

  it("removeScene via sceneStructure preserves remaining IDs; min enforced", async () => {
    const { atomId, companyId, revision, package: initial } = await seed();
    const targetCount = Math.min(
      Math.max(initial.scenes.length + 2, 4),
      12
    );
    const expanded = await patchYouTubeShortDurableEdits({
      atomId,
      companyIdHint: companyId,
      sceneStructure: { setCount: targetCount },
    });
    assert.equal(
      expanded.ok,
      true,
      expanded.ok ? undefined : `expand failed: ${expanded.error}`
    );
    if (!expanded.ok) return;
    const removeId = expanded.package.scenes[2]!.id;
    const keep = expanded.package.scenes
      .filter((s) => s.id !== removeId)
      .map((s) => s.id);

    const removed = await patchYouTubeShortDurableEdits({
      atomId,
      companyIdHint: companyId,
      sceneStructure: { removeSceneId: removeId },
    });
    if (!removed.ok) {
      assert.fail(`remove failed: ${removed.error} (status=${removed.status})`);
    }
    assert.deepEqual(
      removed.package.scenes.map((s) => s.id),
      keep
    );

    // Drain to minimum then refuse.
    let current = removed.package;
    while (current.scenes.length > 2) {
      const id = current.scenes[current.scenes.length - 1]!.id;
      const step = await patchYouTubeShortDurableEdits({
        atomId,
        companyIdHint: companyId,
        sceneStructure: { removeSceneId: id },
      });
      assert.equal(step.ok, true);
      if (!step.ok) return;
      current = step.package;
    }
    const refuse = await patchYouTubeShortDurableEdits({
      atomId,
      companyIdHint: companyId,
      sceneStructure: { removeSceneId: current.scenes[0]!.id },
    });
    assert.equal(refuse.ok, false);

    cleanup(atomId, revision);
  });

  it("globalVisualStyle survives regenerate and clears on Reset All", async () => {
    const { atomId, companyId, revision, atom } = await seed();
    const style =
      "Consistent business-owner character, cinematic soft lighting, no embedded text";
    const patched = await patchYouTubeShortDurableEdits({
      atomId,
      companyIdHint: companyId,
      edits: { globalVisualStyle: style },
    });
    assert.equal(patched.ok, true);
    if (!patched.ok) return;

    const regen = await produceYouTubeShortFormatPackage({
      atom,
      validationReport: null,
      atomRevision: revision,
      priorPackage: patched.package,
      forceRegenerate: true,
    });
    assert.equal(regen.ok, true);
    if (!regen.ok) return;
    assert.equal(regen.package.durableEdits?.globalVisualStyle, style);
    assert.equal(regen.package.globalVisualStyle, style);

    const cleared = resetShortPackageToGeneratedBaseline(
      applyDurableEditsToShortPackage(patched.package, {
        globalVisualStyle: style,
      })
    );
    assert.equal(cleared.durableEdits, undefined);
    assert.equal(
      cleared.globalVisualStyle,
      cleared.generatedBaseline?.globalVisualStyle
    );

    cleanup(atomId, revision);
  });

  it("rejects setCount decrease without archive", async () => {
    const { atomId, companyId, revision } = await seed();
    const expanded = await patchYouTubeShortDurableEdits({
      atomId,
      companyIdHint: companyId,
      sceneStructure: { setCount: 6 },
    });
    assert.equal(expanded.ok, true);
    if (!expanded.ok) return;
    const decrease = await patchYouTubeShortDurableEdits({
      atomId,
      companyIdHint: companyId,
      sceneStructure: { setCount: 3 },
    });
    assert.equal(decrease.ok, false);
    cleanup(atomId, revision);
  });
});

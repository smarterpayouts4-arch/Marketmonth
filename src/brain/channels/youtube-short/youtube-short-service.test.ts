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

import { generateYouTubeShortPackage } from "./specialist";
import {
  channelPackageToYouTubeShortDraft,
  formatPackageToYouTubeShortDraft,
} from "./to-youtube-short-draft";
import {
  applyDurableEditsToShortPackage,
  mergeDurableEdits,
  patchYouTubeShortDurableEdits,
  produceYouTubeShortFormatPackage,
  resetShortPackageToGeneratedBaseline,
  resetShortSceneToGeneratedBaseline,
  resolveEffectiveScene,
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
                : ["limited atom acknowledged for short service test"],
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

describe("YouTube Short package → draft mapper", () => {
  it("maps channel package into YouTubeShortDraft", async () => {
    const atom = await lockedAtomFromFixture();
    const generated = generateYouTubeShortPackage({ atom });
    assert.equal(generated.ok, true);
    if (!generated.ok) return;
    const draft = channelPackageToYouTubeShortDraft(generated.package, {
      source: "atom",
      atomId: atom.atom_id,
      atomRevision: 1,
    });
    assert.equal(draft.formatId, "youtube_short");
    assert.equal(draft.aspectRatio, "9:16");
    assert.equal(draft.hook, generated.package.spoken_hook);
    assert.ok(draft.scenes.length >= 2);
  });
});

describe("YouTube Short channel service", () => {
  const bundlesDir = path.join(runtimeRoot(), "production-bundles");

  before(() => {
    mkdirSync(bundlesDir, { recursive: true });
  });

  after(() => {
    // Leave other test bundles; only clean files we create with known prefix if needed.
  });

  it("produces format package with generatedBaseline", async () => {
    const atom = await lockedAtomFromFixture();
    const result = await produceYouTubeShortFormatPackage({
      atom,
      validationReport: null,
      atomRevision: 1,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(result.package.generatedBaseline);
    assert.equal(
      result.package.imagePrompt,
      result.package.generatedBaseline?.imagePrompt
    );
    const draft = formatPackageToYouTubeShortDraft(result.package);
    assert.equal(draft.script, result.package.script);
  });

  it("applies durable edits and keeps generated baseline recoverable", async () => {
    const atom = await lockedAtomFromFixture();
    const produced = await produceYouTubeShortFormatPackage({
      atom,
      validationReport: null,
      atomRevision: 1,
    });
    assert.equal(produced.ok, true);
    if (!produced.ok) return;

    const edited = applyDurableEditsToShortPackage(produced.package, {
      imagePrompt: "Edited still frame prompt",
      voiceoverPrompt: "Edited voiceover direction",
      script: "Edited full script body for the short",
    });
    assert.equal(edited.imagePrompt, "Edited still frame prompt");
    assert.equal(
      edited.generatedBaseline?.imagePrompt,
      produced.package.imagePrompt
    );
    const reset = resetShortPackageToGeneratedBaseline(edited);
    assert.equal(reset.imagePrompt, produced.package.imagePrompt);
    assert.equal(reset.durableEdits, undefined);
  });

  it("save → reload returns edited values; regen re-applies durable edits", async () => {
    const base = await lockedAtomFromFixture();
    const atom = {
      ...base,
      atom_id: `atom_phase2_${Date.now().toString(36)}`,
      atom_version: 1,
    };
    const repo = createAtomRepository();
    const stored = await repo.save(atom, {
      validationReport: null,
      buildKey: `test|${atom.atom_id}|phase2`,
    });
    const revision = stored.record_revision;

    const produced = await produceYouTubeShortFormatPackage({
      atom: stored.atom,
      validationReport: null,
      atomRevision: revision,
    });
    assert.equal(produced.ok, true);
    if (!produced.ok) return;

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
        imagePrompt: "Persisted image prompt XYZ",
        voiceoverPrompt: "Persisted VO XYZ",
        script: "Persisted script XYZ for reload proof",
      },
    });
    assert.equal(patched.ok, true);
    if (!patched.ok) return;
    assert.equal(patched.package.imagePrompt, "Persisted image prompt XYZ");

    // Reload via second patch read path: reset then re-apply proves persistence round-trip
    const reset = await patchYouTubeShortDurableEdits({
      atomId: atom.atom_id,
      companyIdHint: stored.company_id,
      resetToGenerated: true,
    });
    assert.equal(reset.ok, true);
    if (!reset.ok) return;
    assert.equal(
      reset.package.imagePrompt,
      produced.package.generatedBaseline?.imagePrompt ??
        produced.package.imagePrompt
    );

    const again = await patchYouTubeShortDurableEdits({
      atomId: atom.atom_id,
      companyIdHint: stored.company_id,
      edits: {
        imagePrompt: "Survive regen image",
        voiceoverPrompt: "Survive regen VO",
        script: "Survive regen script body text",
      },
    });
    assert.equal(again.ok, true);
    if (!again.ok) return;

    const regen = await produceYouTubeShortFormatPackage({
      atom: stored.atom,
      validationReport: null,
      atomRevision: revision,
      priorPackage: again.package,
      forceRegenerate: true,
    });
    assert.equal(regen.ok, true);
    if (!regen.ok) return;
    assert.equal(regen.package.imagePrompt, "Survive regen image");
    assert.equal(
      regen.package.durableEdits?.script,
      "Survive regen script body text"
    );
    assert.ok(regen.package.generatedBaseline);
    assert.notEqual(
      regen.package.generatedBaseline?.imagePrompt,
      "Survive regen image"
    );

    try {
      rmSync(
        path.join(
          bundlesDir,
          `${atom.atom_id.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100)}_r${revision}.json`
        ),
        { force: true }
      );
    } catch {
      /* ignore */
    }
  });

  it("merges sparse scene field overrides without wiping sibling scenes", () => {
    const existing = mergeDurableEdits(undefined, {
      scenes: {
        s1_hook: { visualPrompt: "Scene 1 visual A" },
        s2_context: { narration: "Scene 2 narration A" },
      },
    });
    const merged = mergeDurableEdits(existing, {
      scenes: {
        s1_hook: { onScreenText: "HOOK" },
        s3_claim: { assetType: "video" },
      },
    });
    assert.equal(merged.scenes?.s1_hook?.visualPrompt, "Scene 1 visual A");
    assert.equal(merged.scenes?.s1_hook?.onScreenText, "HOOK");
    assert.equal(merged.scenes?.s2_context?.narration, "Scene 2 narration A");
    assert.equal(merged.scenes?.s3_claim?.assetType, "video");
  });

  it("resolves effective scene field-by-field", () => {
    const generated = {
      id: "s1_hook",
      order: 0,
      durationSeconds: 3,
      narration: "gen narration",
      onScreenText: "gen ost",
      visualPrompt: "gen visual",
      assetType: "image" as const,
    };
    const baseline = {
      visualPrompt: "base visual",
      narration: "base narration",
      onScreenText: "base ost",
      assetType: "image" as const,
    };
    const durable = { visualPrompt: "edit visual" };
    const effective = resolveEffectiveScene(generated, baseline, durable);
    assert.equal(effective.visualPrompt, "edit visual");
    assert.equal(effective.narration, "base narration");
    assert.equal(effective.onScreenText, "base ost");
    assert.equal(effective.assetType, "image");
  });

  it("persists nine independent scene edit sets; resetScene and reset-all", async () => {
    const base = await lockedAtomFromFixture();
    const atom = {
      ...base,
      atom_id: `atom_phase3b_${Date.now().toString(36)}`,
      atom_version: 1,
    };
    const repo = createAtomRepository();
    const stored = await repo.save(atom, {
      validationReport: null,
      buildKey: `test|${atom.atom_id}|phase3b`,
    });
    const revision = stored.record_revision;

    const produced = await produceYouTubeShortFormatPackage({
      atom: stored.atom,
      validationReport: null,
      atomRevision: revision,
    });
    assert.equal(produced.ok, true);
    if (!produced.ok) return;

    // Expand to 9 stable scenes for acceptance (specialist may emit fewer).
    const nineScenes = Array.from({ length: 9 }, (_, i) => {
      const id = `s${i + 1}_scene`;
      return {
        id,
        order: i,
        durationSeconds: 3,
        narration: `Generated narration ${i + 1}`,
        onScreenText: `OST ${i + 1}`,
        visualPrompt: `Generated visual ${i + 1}`,
        assetType: "image" as const,
      };
    });
    const sceneBaselines = Object.fromEntries(
      nineScenes.map((s) => [
        s.id,
        {
          visualPrompt: s.visualPrompt,
          narration: s.narration,
          onScreenText: s.onScreenText,
          assetType: s.assetType,
        },
      ])
    );
    const pkgWithNine = {
      ...produced.package,
      scenes: nineScenes,
      durationSeconds: 27,
      generatedBaseline: {
        imagePrompt: produced.package.imagePrompt,
        voiceoverPrompt: produced.package.voiceoverPrompt,
        script: produced.package.script,
        scenes: sceneBaselines,
      },
    };

    const bundle: ContentProductionBundle = {
      atomId: atom.atom_id,
      atomRevision: revision,
      buildKey: stored.build_key ?? `test|${atom.atom_id}|${revision}`,
      companyId: stored.company_id,
      packages: [pkgWithNine],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveProductionBundle(bundle);

    const sceneEdits = Object.fromEntries(
      nineScenes.map((s, i) => [
        s.id,
        {
          visualPrompt: `EDIT visual ${i + 1}`,
          narration: `EDIT narration ${i + 1}`,
          onScreenText: `EDIT OST ${i + 1}`,
          assetType: i % 2 === 0 ? ("image" as const) : ("video" as const),
        },
      ])
    );

    const patched = await patchYouTubeShortDurableEdits({
      atomId: atom.atom_id,
      companyIdHint: stored.company_id,
      edits: { scenes: sceneEdits },
    });
    assert.equal(patched.ok, true);
    if (!patched.ok) return;
    assert.equal(patched.package.scenes.length, 9);
    for (let i = 0; i < 9; i++) {
      const expectedId = `s${i + 1}_scene`;
      assert.equal(patched.package.scenes[i]?.id, expectedId);
      assert.equal(
        patched.package.scenes[i]?.visualPrompt,
        `EDIT visual ${i + 1}`
      );
      assert.equal(
        patched.package.scenes[i]?.narration,
        `EDIT narration ${i + 1}`
      );
      assert.equal(
        patched.package.scenes[i]?.onScreenText,
        `EDIT OST ${i + 1}`
      );
      assert.equal(
        patched.package.scenes[i]?.assetType,
        i % 2 === 0 ? "image" : "video"
      );
    }

    // Partial patch on one scene must not wipe others.
    const partial = await patchYouTubeShortDurableEdits({
      atomId: atom.atom_id,
      companyIdHint: stored.company_id,
      edits: {
        scenes: {
          s1_scene: { visualPrompt: "ONLY visual change on scene 1" },
        },
      },
    });
    assert.equal(partial.ok, true);
    if (!partial.ok) return;
    assert.equal(
      partial.package.scenes.find((s) => s.id === "s1_scene")?.visualPrompt,
      "ONLY visual change on scene 1"
    );
    assert.equal(
      partial.package.scenes.find((s) => s.id === "s1_scene")?.narration,
      "EDIT narration 1"
    );
    assert.equal(
      partial.package.scenes.find((s) => s.id === "s2_scene")?.narration,
      "EDIT narration 2"
    );

    const resetOne = await patchYouTubeShortDurableEdits({
      atomId: atom.atom_id,
      companyIdHint: stored.company_id,
      resetSceneId: "s1_scene",
    });
    assert.equal(resetOne.ok, true);
    if (!resetOne.ok) return;
    assert.equal(
      resetOne.package.scenes.find((s) => s.id === "s1_scene")?.visualPrompt,
      "Generated visual 1"
    );
    assert.equal(
      resetOne.package.scenes.find((s) => s.id === "s2_scene")?.visualPrompt,
      "EDIT visual 2"
    );

    const regen = await produceYouTubeShortFormatPackage({
      atom: stored.atom,
      validationReport: null,
      atomRevision: revision,
      priorPackage: {
        ...resetOne.package,
        // Keep nine-scene package shape for merge proof on overlapping ids.
        scenes: resetOne.package.scenes,
        generatedBaseline: resetOne.package.generatedBaseline,
      },
      forceRegenerate: true,
    });
    assert.equal(regen.ok, true);
    if (!regen.ok) return;
    // Durable overrides for specialist scene ids that still exist are re-applied.
    assert.ok(regen.package.durableEdits?.scenes);

    const resetAll = resetShortSceneToGeneratedBaseline(
      applyDurableEditsToShortPackage(pkgWithNine, { scenes: sceneEdits }),
      "s3_scene"
    );
    assert.equal(
      resetAll.scenes.find((s) => s.id === "s3_scene")?.visualPrompt,
      "Generated visual 3"
    );
    assert.equal(
      resetAll.scenes.find((s) => s.id === "s4_scene")?.visualPrompt,
      "EDIT visual 4"
    );

    const cleared = resetShortPackageToGeneratedBaseline(
      applyDurableEditsToShortPackage(pkgWithNine, { scenes: sceneEdits })
    );
    assert.equal(cleared.durableEdits, undefined);
    assert.equal(
      cleared.scenes.find((s) => s.id === "s5_scene")?.visualPrompt,
      "Generated visual 5"
    );

    try {
      rmSync(
        path.join(
          bundlesDir,
          `${atom.atom_id.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100)}_r${revision}.json`
        ),
        { force: true }
      );
    } catch {
      /* ignore */
    }
  });
});

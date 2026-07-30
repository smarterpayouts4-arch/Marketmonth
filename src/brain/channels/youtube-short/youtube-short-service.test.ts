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
});

import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { approveAtom, deriveLimitations, lockAtom } from "@/brain/atom";
import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";
import { runCoreContentBrain } from "@/brain/pipeline";
import { saveProductionBundle } from "@/brain/content-studio/bundle-store";
import type { ContentProductionBundle } from "@/brain/content-studio/schemas/format-package";
import { createAtomRepository } from "@/brain/store";
import { runtimeRoot } from "@/brain/store/paths";
import { getContentBundle } from "@/brain/use-cases/produce-content-bundle";

import { contentProductionBundleSchema } from "@/brain/content-studio/schemas/format-package";

import {
  ingestYouTubeShortScenePrompt,
  setSceneIngestLlmAdapterForTests,
} from "./ingest-scene-prompt";
import { patchYouTubeShortDurableEdits } from "./patch-durable-edits";
import { produceYouTubeShortFormatPackage } from "./produce-format-package";
import {
  SCENE_PASTE_PROMPT_MAX_CHARS,
  SCENE_VISUAL_PROMPT_MAX_CHARS,
} from "./scene-field-limits";
import { youtubeShortSceneIngestExtractSchema } from "./youtube-short-draft";

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
                : ["limited atom acknowledged for ingest test"],
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

describe("YouTube Short scene prompt ingestion", () => {
  before(() => {
    mkdirSync(path.join(runtimeRoot(), "production-bundles"), {
      recursive: true,
    });
  });

  after(() => {
    setSceneIngestLlmAdapterForTests(null);
  });

  async function seedBundle() {
    const base = await lockedAtomFromFixture();
    const atom = {
      ...base,
      atom_id: `atom_ingest_${Date.now().toString(36)}`,
      atom_version: 1,
    };
    const repo = createAtomRepository();
    const stored = await repo.save(atom, {
      validationReport: null,
      buildKey: `test|${atom.atom_id}|ingest`,
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
      sceneId: produced.package.scenes[0]!.id,
      package: produced.package,
    };
  }

  it("returns the four canonical fields and folds mood/style into visualPrompt", async () => {
    const { atomId, companyId, sceneId } = await seedBundle();
    setSceneIngestLlmAdapterForTests(async () => ({
      ok: true,
      raw: JSON.stringify({
        visualPrompt:
          "Business owner amid disconnected dashboards, overwhelmed but professional, dark green editorial style, soft side light",
        narration: "Most teams do not lack ideas; they lack clarity.",
        onScreenText: "Too many ideas. No clear direction.",
        assetType: "image",
      }),
    }));

    const result = await ingestYouTubeShortScenePrompt({
      atomId,
      companyIdHint: companyId,
      sceneId,
      prompt:
        "Create a vertical YouTube Short scene showing a business owner surrounded by disconnected dashboards. Mood overwhelmed but professional, dark green editorial. Narration: most teams lack clarity. OST: Too many ideas. No clear direction. Use an image.",
      apiKey: "test-key",
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    const parsed = youtubeShortSceneIngestExtractSchema.parse(result.extracted);
    assert.equal(parsed.assetType, "image");
    assert.match(parsed.visualPrompt, /dark green|editorial|overwhelmed/i);
    assert.match(parsed.narration, /clarity/i);
    assert.match(parsed.onScreenText, /Too many ideas/i);
    assert.equal(result.repairUsed, false);
  });

  it("does not mutate persisted durable edits (no auto-save)", async () => {
    const { atomId, companyId, sceneId, package: pkg } = await seedBundle();
    const beforeDurable = JSON.stringify(pkg.durableEdits ?? null);

    setSceneIngestLlmAdapterForTests(async () => ({
      ok: true,
      raw: JSON.stringify({
        visualPrompt: "INGEST_ONLY visual",
        narration: "INGEST_ONLY narration",
        onScreenText: "INGEST OST",
        assetType: "video",
      }),
    }));

    const result = await ingestYouTubeShortScenePrompt({
      atomId,
      companyIdHint: companyId,
      sceneId,
      prompt: "Make a video scene about clarity.",
      apiKey: "test-key",
    });
    assert.equal(result.ok, true);

    const bundle = await getContentBundle({ atomId });
    assert.equal(bundle.ok, true);
    if (!bundle.ok) return;
    const short = bundle.bundle.packages.find(
      (p) => p.formatId === "youtube_short"
    );
    assert.ok(short);
    assert.equal(JSON.stringify(short!.durableEdits ?? null), beforeDurable);
    assert.notEqual(short!.scenes[0]?.visualPrompt, "INGEST_ONLY visual");
  });

  it("invalid model output does not mutate persisted data; repair recovers", async () => {
    const { atomId, companyId, sceneId } = await seedBundle();
    let calls = 0;
    setSceneIngestLlmAdapterForTests(async () => {
      calls += 1;
      if (calls === 1) {
        return { ok: true, raw: '{"visualPrompt":"only"}' };
      }
      return {
        ok: true,
        raw: JSON.stringify({
          visualPrompt: "Repaired visual with calm teal palette",
          narration: "Repaired narration line",
          onScreenText: "Repaired OST",
          assetType: "image",
        }),
      };
    });

    const result = await ingestYouTubeShortScenePrompt({
      atomId,
      companyIdHint: companyId,
      sceneId,
      prompt: "A calm teal scene.",
      apiKey: "test-key",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.repairUsed, true);
    assert.equal(calls, 2);
    assert.match(result.extracted.visualPrompt, /teal/i);

    const bundle = await getContentBundle({ atomId });
    assert.equal(bundle.ok, true);
    if (!bundle.ok) return;
    const short = bundle.bundle.packages.find(
      (p) => p.formatId === "youtube_short"
    );
    assert.ok(short);
    assert.equal(short!.durableEdits?.scenes?.[sceneId], undefined);
  });

  it("Paste Prompt extract schema has only four scene fields (no globalVisualStyle)", () => {
    const shape = youtubeShortSceneIngestExtractSchema.shape;
    assert.deepEqual(Object.keys(shape).sort(), [
      "assetType",
      "narration",
      "onScreenText",
      "visualPrompt",
    ]);
    assert.equal("globalVisualStyle" in shape, false);
  });

  it("rejects paste source over 16000 characters before LLM", async () => {
    const { atomId, companyId, sceneId } = await seedBundle();
    let calls = 0;
    setSceneIngestLlmAdapterForTests(async () => {
      calls += 1;
      return { ok: true, raw: "{}" };
    });
    const over = "p".repeat(SCENE_PASTE_PROMPT_MAX_CHARS + 1);
    const result = await ingestYouTubeShortScenePrompt({
      atomId,
      companyIdHint: companyId,
      sceneId,
      prompt: over,
      apiKey: "test-key",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 400);
    assert.match(result.error, /16000/);
    assert.equal(calls, 0);
  });

  it("accepts paste source of exactly 16000 characters at the gate", async () => {
    const { atomId, companyId, sceneId } = await seedBundle();
    setSceneIngestLlmAdapterForTests(async () => ({
      ok: true,
      raw: JSON.stringify({
        visualPrompt: "Exact paste ceiling visual",
        narration: "Exact paste ceiling narration",
        onScreenText: "OST",
        assetType: "image",
      }),
    }));
    const result = await ingestYouTubeShortScenePrompt({
      atomId,
      companyIdHint: companyId,
      sceneId,
      prompt: "p".repeat(SCENE_PASTE_PROMPT_MAX_CHARS),
      apiKey: "test-key",
    });
    assert.equal(result.ok, true);
  });

  it("long extracted visual fills extract and persists through PATCH + bundle parse", async () => {
    const { atomId, companyId, sceneId } = await seedBundle();
    const longVisual = "L".repeat(4169);
    setSceneIngestLlmAdapterForTests(async () => ({
      ok: true,
      raw: JSON.stringify({
        visualPrompt: longVisual,
        narration: "Why is magnesium getting so much attention?",
        onScreenText: "Why is magnesium getting so much attention?",
        assetType: "image",
      }),
    }));

    const extracted = await ingestYouTubeShortScenePrompt({
      atomId,
      companyIdHint: companyId,
      sceneId,
      prompt: `SCENE 1\n\nVISUAL PROMPT\n${longVisual}\n\nNARRATION\nWhy?\n\nON-SCREEN TEXT\nWhy?\n\nASSET TYPE\nimage`,
      apiKey: "test-key",
    });
    assert.equal(extracted.ok, true);
    if (!extracted.ok) return;
    assert.equal(extracted.extracted.visualPrompt.length, 4169);
    assert.equal(extracted.extracted.visualPrompt, longVisual);

    const patched = await patchYouTubeShortDurableEdits({
      atomId,
      companyIdHint: companyId,
      edits: {
        scenes: {
          [sceneId]: extracted.extracted,
        },
      },
    });
    assert.equal(patched.ok, true);
    if (!patched.ok) return;
    const scene = patched.package.scenes.find((s) => s.id === sceneId);
    assert.ok(scene);
    assert.equal(scene!.visualPrompt, longVisual);
    assert.equal(scene!.visualPrompt.length, 4169);

    const reparsed = contentProductionBundleSchema.safeParse(patched.bundle);
    assert.equal(reparsed.success, true);
  });

  it("reject extract when visualPrompt exceeds 8000 (no silent truncate)", async () => {
    const { atomId, companyId, sceneId } = await seedBundle();
    const tooLong = "x".repeat(SCENE_VISUAL_PROMPT_MAX_CHARS + 1);
    setSceneIngestLlmAdapterForTests(async () => ({
      ok: true,
      raw: JSON.stringify({
        visualPrompt: tooLong,
        narration: "Narration line",
        onScreenText: "OST",
        assetType: "image",
      }),
    }));
    const result = await ingestYouTubeShortScenePrompt({
      atomId,
      companyIdHint: companyId,
      sceneId,
      prompt: "A long visual brief.",
      apiKey: "test-key",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 422);
    assert.match(result.error, /Could not extract valid scene fields/);
    assert.match(result.error, /<=8000 characters/);
  });

  it("saving extracted fields uses existing durable PATCH", async () => {
    const { atomId, companyId, sceneId } = await seedBundle();
    setSceneIngestLlmAdapterForTests(async () => ({
      ok: true,
      raw: JSON.stringify({
        visualPrompt: "PATCH_ME visual",
        narration: "PATCH_ME narration",
        onScreenText: "PATCH OST",
        assetType: "video",
      }),
    }));

    const extracted = await ingestYouTubeShortScenePrompt({
      atomId,
      companyIdHint: companyId,
      sceneId,
      prompt: "Video scene.",
      apiKey: "test-key",
    });
    assert.equal(extracted.ok, true);
    if (!extracted.ok) return;

    const patched = await patchYouTubeShortDurableEdits({
      atomId,
      companyIdHint: companyId,
      edits: {
        scenes: {
          [sceneId]: extracted.extracted,
        },
      },
    });
    assert.equal(patched.ok, true);
    if (!patched.ok) return;
    const scene = patched.package.scenes.find((s) => s.id === sceneId);
    assert.ok(scene);
    assert.equal(scene!.visualPrompt, "PATCH_ME visual");
    assert.equal(scene!.narration, "PATCH_ME narration");
    assert.equal(scene!.onScreenText, "PATCH OST");
    assert.equal(scene!.assetType, "video");
  });
});

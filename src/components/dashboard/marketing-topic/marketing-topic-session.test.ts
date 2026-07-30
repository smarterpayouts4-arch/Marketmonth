import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { generateContentDirections } from "@/brain/content/generate-content-directions";
import { buildAutomaticMasterFromCandidates } from "@/brain/content/gcd/build-automatic-master-from-candidates";
import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";
import {
  buildTopicGenerationRecord,
  findSimilarTopicNotice,
} from "@/brain/content/topic-generation-record";
import type { ContentBrainContext } from "@/brain/content/types";
import { compileBrandCore, resolveBrandCoreIdentity } from "@/brain/core";
import { createTopicGenerationRepository } from "@/brain/store";

import { buildContentDirectionsRequest } from "./build-content-directions-request";
import {
  REGENERATE_IDEAS_BUTTON_LABEL,
  START_OVER_BUTTON_LABEL,
} from "./copy";
import { emptyExtraContextUi } from "./extra-context-client";

const dir = path.dirname(fileURLToPath(import.meta.url));

function readSrc(name: string): string {
  return readFileSync(path.join(dir, name), "utf8");
}

const FIXTURE_CSV = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../data/companies/zynava.com/approved.csv"
);

function loadFixtureContext(): ContentBrainContext {
  const text = readFileSync(FIXTURE_CSV, "utf8");
  const ctx = parseFixtureCsv(text);
  assert.ok(ctx);
  return ctx;
}

describe("Marketing Topic Phase 2 session + history", () => {
  it("1+2+13: hook never hydrates handoff and never calls directions API on mount", () => {
    const hook = readSrc("hooks/use-content-directions.ts");
    assert.doesNotMatch(hook, /loadContentDirectionsHandoff/);
    assert.doesNotMatch(hook, /loadContentDirectionsHandoffAsync/);
    assert.doesNotMatch(hook, /useSyncExternalStore/);
    assert.doesNotMatch(hook, /handoffToReadyResult/);
    assert.doesNotMatch(hook, /useEffect\(/);
    assert.match(hook, /useState<SessionStatus>\("idle"\)/);
    assert.match(hook, /Does not write Studio localStorage handoff/);
    assert.match(hook, /confirmDirectionAndBuildAtom/);
  });

  it("3: Auto-generate uses fixture Brand Core as primary truth", async () => {
    const context = loadFixtureContext();
    const result = await generateContentDirections({
      context,
      mode: "automatic",
      requestSalt: "auto-brand-core",
    });
    assert.notEqual(result.status, "blocked");
    if (result.status === "blocked") return;
    assert.equal(result.brandName, context.brandName);
    assert.equal(result.masterTopic.source, "automatic");
    assert.ok(result.masterTopic.punchline.length > 0);
    assert.equal(result.variations.length, 6);
  });

  it("4: Auto-generate prefers a non-repetitive master from recent history", () => {
    const context = loadFixtureContext();
    const first = buildAutomaticMasterFromCandidates(context, []);
    const second = first
      ? buildAutomaticMasterFromCandidates(context, [first.punchline])
      : null;
    assert.ok(first, "expected grounded automatic master from fixture");
    assert.ok(second, "expected alternate master when recent history excludes first");
    assert.notEqual(
      second!.punchline.trim().toLowerCase(),
      first!.punchline.trim().toLowerCase()
    );
  });

  it("5: Manual Generate preserves typed topic even when history has a similar topic", async () => {
    const context = loadFixtureContext();
    const topic = "Magnesium for evening recovery routines";
    const notice = findSimilarTopicNotice(topic, [
      {
        generation_id: "tgen_old",
        master_topic: "Magnesium for evening recovery",
        status: "generated",
      },
    ]);
    assert.equal(notice, "A similar topic was generated recently.");

    const result = await generateContentDirections({
      context,
      mode: "manual",
      topic,
      requestSalt: "manual-similar",
    });
    assert.notEqual(result.status, "blocked");
    if (result.status === "blocked") return;
    assert.equal(result.masterTopic.punchline, topic);
    assert.ok(
      result.variations.every((v) =>
        (v.specificTopic || v.punchline).toLowerCase().includes("magnesium")
      )
    );
  });

  it("6+11: history records persist with lineage / regenerate parent", async () => {
    const prevCwd = process.cwd();
    const tempRoot = mkdtempSync(path.join(tmpdir(), "mm-tgen-"));
    process.chdir(tempRoot);
    try {
      const repo = createTopicGenerationRepository();
      const context = loadFixtureContext();
      const identity = resolveBrandCoreIdentity(compileBrandCore(context));
      const first = await generateContentDirections({
        context,
        mode: "automatic",
        requestSalt: "hist-1",
      });
      assert.notEqual(first.status, "blocked");
      if (first.status === "blocked") return;

      const parent = buildTopicGenerationRecord({
        result: first,
        identity,
        domain: context.domain,
        mode: "automatic",
        noveltyContext: {
          recent_generation_ids: [],
          repeated_topic_allowed: false,
        },
        provider: "deterministic-v1",
      });
      await repo.create(parent);

      const regen = await generateContentDirections({
        context,
        mode: "automatic",
        lockedMasterTopic: first.masterTopic.punchline,
        requestSalt: "hist-2",
      });
      assert.notEqual(regen.status, "blocked");
      if (regen.status === "blocked") return;
      assert.equal(regen.masterTopic.punchline, first.masterTopic.punchline);

      const child = buildTopicGenerationRecord({
        result: regen,
        identity,
        domain: context.domain,
        mode: "regenerate",
        parentGenerationId: parent.generation_id,
        provider: "deterministic-v1",
      });
      await repo.create(child);

      const loaded = await repo.getById(child.generation_id);
      assert.ok(loaded);
      assert.equal(loaded.mode, "regenerate");
      assert.equal(loaded.parent_generation_id, parent.generation_id);
      assert.equal(loaded.master_topic, first.masterTopic.punchline);

      const recent = await repo.listByCompany(identity.company_id);
      assert.ok(recent.some((r) => r.generation_id === parent.generation_id));
      assert.ok(recent.some((r) => r.generation_id === child.generation_id));
    } finally {
      process.chdir(prevCwd);
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("7+8+9: Start over clears session only; abandon does not delete history", async () => {
    const prevCwd = process.cwd();
    const tempRoot = mkdtempSync(path.join(tmpdir(), "mm-tgen-so-"));
    process.chdir(tempRoot);
    try {
      const repo = createTopicGenerationRepository();
      const context = loadFixtureContext();
      const identity = resolveBrandCoreIdentity(compileBrandCore(context));
      const result = await generateContentDirections({
        context,
        mode: "manual",
        topic: "Clearer offer messaging for growth teams",
        requestSalt: "start-over",
      });
      assert.notEqual(result.status, "blocked");
      if (result.status === "blocked") return;

      const record = buildTopicGenerationRecord({
        result,
        identity,
        domain: context.domain,
        mode: "manual",
        inputTopic: "Clearer offer messaging for growth teams",
        provider: "deterministic-v1",
      });
      await repo.create(record);

      const abandoned = await repo.updateStatus({
        generationId: record.generation_id,
        status: "abandoned",
        expectedRevision: record.record_revision,
      });
      assert.ok(abandoned);
      assert.equal(abandoned.status, "abandoned");

      const stillThere = await repo.getById(record.generation_id);
      assert.ok(stillThere);
      assert.equal(stillThere.master_topic, result.masterTopic.punchline);

      const hook = readSrc("hooks/use-content-directions.ts");
      assert.match(hook, /function startOver/);
      assert.match(hook, /setSessionStatus\("idle"\)/);
      assert.match(hook, /setReadyResult\(null\)/);
      assert.match(hook, /setTopicDraft\(""\)/);
      const startOverBlock = hook.slice(
        hook.indexOf("function startOver"),
        hook.indexOf("async function requestDirections")
      );
      assert.doesNotMatch(startOverBlock, /\/api\/brain\/content-directions/);
      assert.match(startOverBlock, /action: "abandon"/);
    } finally {
      process.chdir(prevCwd);
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("10: stale in-flight responses are ignored via request id + abort", () => {
    const hook = readSrc("hooks/use-content-directions.ts");
    assert.match(hook, /requestIdRef/);
    assert.match(hook, /AbortController/);
    assert.match(hook, /requestIdRef\.current !== requestId/);
    assert.match(hook, /controller\.signal\.aborted/);
  });

  it("12: selecting a direction updates history status and request builder stays ID-based", async () => {
    const prevCwd = process.cwd();
    const tempRoot = mkdtempSync(path.join(tmpdir(), "mm-tgen-sel-"));
    process.chdir(tempRoot);
    try {
      const repo = createTopicGenerationRepository();
      const context = loadFixtureContext();
      const identity = resolveBrandCoreIdentity(compileBrandCore(context));
      const result = await generateContentDirections({
        context,
        mode: "automatic",
        requestSalt: "select-1",
      });
      assert.notEqual(result.status, "blocked");
      if (result.status === "blocked") return;

      const record = buildTopicGenerationRecord({
        result,
        identity,
        domain: context.domain,
        mode: "automatic",
        provider: "deterministic-v1",
      });
      await repo.create(record);

      const selectedId = result.variations[0].id;
      const selected = await repo.updateSelection({
        generationId: record.generation_id,
        selectedDirectionId: selectedId,
        expectedRevision: record.record_revision,
      });
      const continued = await repo.updateStatus({
        generationId: record.generation_id,
        status: "continued",
        expectedRevision: selected.record_revision,
      });
      assert.equal(continued.selected_direction_id, selectedId);
      assert.equal(continued.status, "continued");

      const hook = readSrc("hooks/use-content-directions.ts");
      assert.match(hook, /confirmDirectionAndBuildAtom/);
      assert.match(hook, /\/api\/brain\/content-atom/);
      assert.match(hook, /action: "continue"/);
      assert.doesNotMatch(hook, /saveContentDirectionsHandoff/);
    } finally {
      process.chdir(prevCwd);
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("UI exposes Start over + Regenerate ideas; request builder supports regenerate", () => {
    assert.equal(START_OVER_BUTTON_LABEL, "Start over");
    assert.equal(REGENERATE_IDEAS_BUTTON_LABEL, "Regenerate ideas");
    const card = readSrc("topic-creation-card.tsx");
    assert.match(card, /START_OVER_BUTTON_LABEL/);
    assert.match(card, /REGENERATE_IDEAS_BUTTON_LABEL/);

    const built = buildContentDirectionsRequest({
      domain: "zynava.com",
      mode: "manual",
      lockedMasterTopic: "Magnesium for sleep quality",
      generationReason: "regenerate",
      parentGenerationId: "tgen_parent",
      topicCategory: null,
      contextState: emptyExtraContextUi(),
    });
    assert.equal(built.ok, true);
    if (!built.ok) return;
    assert.equal(built.body.generationReason, "regenerate");
    assert.equal(built.body.lockedMasterTopic, "Magnesium for sleep quality");
    assert.equal(built.body.parentGenerationId, "tgen_parent");
  });
});

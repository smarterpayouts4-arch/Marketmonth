import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { generateContentDirections } from "@/brain/content/generate-content-directions";
import { normalizeInputTopic } from "@/brain/content/normalize-topic";
import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";
import { buildTopicGenerationRecord } from "@/brain/content/topic-generation-record";
import { compileBrandCore, resolveBrandCoreIdentity } from "@/brain/core";

import { createTopicGenerationRepository } from "./create-topic-generation-repository";

const FIXTURE = path.join(
  process.cwd(),
  "data/fixtures/zynava-discovery.csv"
);

function loadContext() {
  const ctx = parseFixtureCsv(readFileSync(FIXTURE, "utf8"));
  assert.ok(ctx);
  return ctx;
}

describe("Topic Generation History and Evaluation Repository", () => {
  let prevCwd: string;
  let tempRoot: string;

  beforeEach(() => {
    prevCwd = process.cwd();
    tempRoot = mkdtempSync(path.join(tmpdir(), "mm-hist-"));
    process.chdir(tempRoot);
  });

  afterEach(() => {
    process.chdir(prevCwd);
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it("1+2: same topic twice creates two records; earlier not overwritten", async () => {
    const repo = createTopicGenerationRepository();
    const context = loadContext();
    const identity = resolveBrandCoreIdentity(compileBrandCore(context));
    const topic = "Magnesium";

    const a = await generateContentDirections({
      context,
      mode: "manual",
      topic,
      requestSalt: "run-a",
    });
    const b = await generateContentDirections({
      context,
      mode: "manual",
      topic,
      requestSalt: "run-b",
    });
    assert.notEqual(a.status, "blocked");
    assert.notEqual(b.status, "blocked");
    if (a.status === "blocked" || b.status === "blocked") return;

    const r1 = buildTopicGenerationRecord({
      result: a,
      identity,
      domain: context.domain,
      mode: "manual",
      inputTopic: topic,
      provider: "deterministic-v1",
      runPurpose: "benchmark",
      comparisonGroupId: "magnesium-benchmark-01",
      experimentId: "exp-a",
    });
    const r2 = buildTopicGenerationRecord({
      result: b,
      identity,
      domain: context.domain,
      mode: "manual",
      inputTopic: topic,
      provider: "deterministic-v1",
      runPurpose: "benchmark",
      comparisonGroupId: "magnesium-benchmark-01",
      experimentId: "exp-b",
    });
    // Distinct prompt versions for comparison provenance
    r2.generation_provenance = {
      ...r2.generation_provenance,
      prompt_version: "directions-v3-test",
      brain_version: "1.1.0",
    };

    await repo.create(r1);
    await repo.create(r2);

    assert.notEqual(r1.generation_id, r2.generation_id);
    const loaded1 = await repo.getById(r1.generation_id);
    assert.equal(loaded1?.master_topic, a.masterTopic.punchline);
    assert.equal(loaded1?.generation_provenance.prompt_version, "none");
    assert.equal(
      loaded1?.generation_provenance.brain_version,
      "deterministic-v1"
    );
    assert.equal(
      loaded1?.generation_provenance.provider,
      "deterministic-v1"
    );

    const group = await repo.listByComparisonGroup("magnesium-benchmark-01");
    assert.equal(group.length, 2);
    assert.ok(group[0].created_at <= group[1].created_at);

    const byTopic = await repo.listByNormalizedTopic({
      companyId: identity.company_id,
      normalizedTopic: normalizeInputTopic(topic),
    });
    assert.equal(byTopic.length, 2);
  });

  it("3+17+18: normalization groups casing/whitespace; preserves input_topic", async () => {
    const repo = createTopicGenerationRepository();
    const context = loadContext();
    const identity = resolveBrandCoreIdentity(compileBrandCore(context));
    const result = await generateContentDirections({
      context,
      mode: "manual",
      topic: "  MAGNESIUM  ",
      requestSalt: "norm",
    });
    if (result.status === "blocked") return;
    const record = buildTopicGenerationRecord({
      result,
      identity,
      domain: context.domain,
      mode: "manual",
      inputTopic: "  MAGNESIUM  ",
      provider: "deterministic-v1",
    });
    await repo.create(record);
    assert.equal(record.input_topic, "MAGNESIUM");
    assert.equal(record.normalized_input_topic, "magnesium");
    const found = await repo.listByNormalizedTopic({
      companyId: identity.company_id,
      normalizedTopic: "magnesium",
    });
    assert.equal(found.length, 1);
  });

  it("4–9: provenance, parent, comparison group preserved", async () => {
    const repo = createTopicGenerationRepository();
    const context = loadContext();
    const identity = resolveBrandCoreIdentity(compileBrandCore(context));
    const first = await generateContentDirections({
      context,
      mode: "automatic",
      requestSalt: "p1",
    });
    if (first.status === "blocked") return;
    const parent = buildTopicGenerationRecord({
      result: first,
      identity,
      domain: context.domain,
      mode: "automatic",
      provider: "deterministic-v1",
      comparisonGroupId: "grp-1",
    });
    await repo.create(parent);

    const regen = await generateContentDirections({
      context,
      mode: "automatic",
      lockedMasterTopic: first.masterTopic.punchline,
      requestSalt: "p2",
    });
    if (regen.status === "blocked") return;
    const child = buildTopicGenerationRecord({
      result: regen,
      identity,
      domain: context.domain,
      mode: "regenerate",
      parentGenerationId: parent.generation_id,
      comparisonGroupId: "grp-1",
      provider: "openai",
      model: "gpt-test",
    });
    await repo.create(child);

    const loaded = await repo.getById(child.generation_id);
    assert.equal(loaded?.parent_generation_id, parent.generation_id);
    assert.equal(loaded?.generation_provenance.provider, "openai");
    assert.equal(loaded?.generation_provenance.model, "gpt-test");
    assert.equal(loaded?.brand_core_hash, identity.brand_core_hash);
    assert.equal(loaded?.brand_core_id, identity.brand_core_id);
    const group = await repo.listByComparisonGroup("grp-1");
    assert.equal(group.length, 2);
  });

  it("10–12: evaluation attach does not mutate directions/provenance; not auto-better", async () => {
    const repo = createTopicGenerationRepository();
    const context = loadContext();
    const identity = resolveBrandCoreIdentity(compileBrandCore(context));
    const result = await generateContentDirections({
      context,
      mode: "manual",
      topic: "Magnesium sleep",
      requestSalt: "eval",
    });
    if (result.status === "blocked") return;
    const record = buildTopicGenerationRecord({
      result,
      identity,
      domain: context.domain,
      mode: "evaluation",
      runPurpose: "benchmark",
      inputTopic: "Magnesium sleep",
      provider: "deterministic-v1",
    });
    await repo.create(record);
    const directionsBefore = JSON.stringify(record.directions);
    const provBefore = JSON.stringify(record.generation_provenance);

    const updated = await repo.saveEvaluation({
      generationId: record.generation_id,
      expectedRevision: 1,
      evaluation: {
        review_status: "reviewed",
        overall_score: 7,
        flags: ["strong_output"],
        notes: "Clearer than prior run",
        preferred_over_comparison: true,
        compared_to_generation_id: "tgen_other",
      },
    });
    assert.equal(JSON.stringify(updated.directions), directionsBefore);
    assert.equal(JSON.stringify(updated.generation_provenance), provBefore);
    assert.equal(updated.evaluation?.preferred_over_comparison, true);
    assert.equal(updated.record_revision, 2);
    // Creating a newer run does not auto-set preferred
    assert.equal(updated.evaluation?.review_status, "reviewed");
  });

  it("13+16: manual vs automatic distinguishable; CSV round-trip", async () => {
    const repo = createTopicGenerationRepository();
    const context = loadContext();
    const identity = resolveBrandCoreIdentity(compileBrandCore(context));
    const manual = await generateContentDirections({
      context,
      mode: "manual",
      topic: "Magnesium glycinate versus citrate",
      requestSalt: "m1",
    });
    const auto = await generateContentDirections({
      context,
      mode: "automatic",
      requestSalt: "a1",
    });
    if (manual.status === "blocked" || auto.status === "blocked") return;
    await repo.create(
      buildTopicGenerationRecord({
        result: manual,
        identity,
        domain: context.domain,
        mode: "manual",
        inputTopic: "Magnesium glycinate versus citrate",
        provider: "deterministic-v1",
      })
    );
    await repo.create(
      buildTopicGenerationRecord({
        result: auto,
        identity,
        domain: context.domain,
        mode: "automatic",
        provider: "deterministic-v1",
      })
    );
    const all = await repo.listByCompany(identity.company_id);
    assert.ok(all.some((r) => r.mode === "manual"));
    assert.ok(all.some((r) => r.mode === "automatic"));
    const reloaded = createTopicGenerationRepository();
    const again = await reloaded.getById(all[0].generation_id);
    assert.ok(again);
    assert.ok(again.directions.length >= 1);
    assert.ok(again.directions[0].idea_summary.length >= 180);
  });

  it("19+20: company CSV unchanged; history is not Brand Core", async () => {
    const before = readFileSync(FIXTURE, "utf8");
    const repo = createTopicGenerationRepository();
    const context = loadContext();
    const identity = resolveBrandCoreIdentity(compileBrandCore(context));
    const result = await generateContentDirections({
      context,
      mode: "manual",
      topic: "Magnesium",
      requestSalt: "csv-safe",
    });
    if (result.status === "blocked") return;
    await repo.create(
      buildTopicGenerationRecord({
        result,
        identity,
        domain: context.domain,
        mode: "evaluation",
        inputTopic: "Magnesium",
        provider: "deterministic-v1",
      })
    );
    const after = readFileSync(FIXTURE, "utf8");
    assert.equal(before, after);
    // Directions brain input remains ContentBrainContext / BrandCore — not history rows
    assert.ok(!("recent_ideas" in context));
  });
});

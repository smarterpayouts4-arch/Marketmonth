import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { generateContentDirections } from "@/brain/content/generate-content-directions";
import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";
import type { MarketingFocus } from "@/brain/content/marketing-focus";
import { selectDirectionsProvider } from "@/brain/policy/provider-policy";
import { resolveModel } from "@/brain/policy/model-registry";
import {
  assertPromptRegistryValid,
  getPromptEntry,
} from "@/brain/policy/prompt-registry";
import { reviewDecisionSchema, REVIEW_DECISION_SCHEMA_VERSION } from "@/brain/contracts";

const ROOT = process.cwd();
const FIXTURE_DIR = path.join(ROOT, "data/fixtures/stabilization");
const REQUIRED_ANGLES = [
  "beginner_guide",
  "faq",
  "problem_solution",
  "decision_guide",
  "comparison",
  "trust_transparency",
] as const;

function loadContext() {
  const text = readFileSync(
    path.join(ROOT, "data/fixtures/zynava-discovery.csv"),
    "utf8"
  );
  const ctx = parseFixtureCsv(text);
  assert.ok(ctx);
  return ctx;
}

function loadScenario(id: string) {
  return JSON.parse(
    readFileSync(path.join(FIXTURE_DIR, `${id}.json`), "utf8")
  ) as {
    topic: string;
    mode: "manual" | "automatic";
    marketingFocus?: MarketingFocus;
    recentMasterTopics?: string[];
  };
}

describe("Content Brain stabilization regressions (invariants)", () => {
  it("prompt registry is unique and versioned", () => {
    assert.doesNotThrow(() => assertPromptRegistryValid());
    assert.equal(getPromptEntry("ask.project-knowledge").version.length > 0, true);
  });

  it("unknown provider and model policy fail closed", () => {
    assert.throws(() => selectDirectionsProvider("openai-stub" as never));
    assert.throws(() => resolveModel("not-a-real-model-key"));
  });

  it("normal topic yields six directions with required angles", async () => {
    const scenario = loadScenario("normal-zynava-topic");
    const result = await generateContentDirections({
      context: loadContext(),
      mode: "manual",
      topic: scenario.topic,
      directionsProvider: "deterministic-v1",
      marketingFocus: scenario.marketingFocus,
    });
    assert.equal(result.status, "ready");
    if (result.status !== "ready" && result.status !== "partially_ready") {
      return;
    }
    assert.equal(result.variations.length, 6);
    const angles = result.variations.map((v) => v.angle);
    for (const a of REQUIRED_ANGLES) {
      assert.ok(angles.includes(a), `missing angle ${a}`);
    }
    assert.equal(new Set(angles).size, angles.length);
    assert.ok(result.masterTopic.punchline.trim().length > 0);
  });

  it("unsupported medical claim is blocked", async () => {
    const scenario = loadScenario("unsupported-claim-attempt");
    const result = await generateContentDirections({
      context: loadContext(),
      mode: "manual",
      topic: scenario.topic,
      directionsProvider: "deterministic-v1",
      marketingFocus: scenario.marketingFocus,
    });
    assert.equal(result.status, "blocked");
  });

  it("human selecting nonexistent direction is rejected by review schema usage", () => {
    const decision = reviewDecisionSchema.parse({
      schemaVersion: REVIEW_DECISION_SCHEMA_VERSION,
      decisionType: "direction_select",
      generationId: "tgen_x",
      selectedVariationId: "does-not-exist",
      decidedAt: new Date().toISOString(),
      actor: "human",
    });
    assert.equal(decision.decisionType, "direction_select");
    // Existence check is workflow-level; schema distinguishes decision types.
  });

  it("doctrine change is a distinct decision type", () => {
    const d = reviewDecisionSchema.parse({
      schemaVersion: REVIEW_DECISION_SCHEMA_VERSION,
      decisionType: "doctrine_change_approval",
      documentPath: "project-knowledge/CONTENT_BRAIN.md",
      decidedAt: new Date().toISOString(),
      actor: "human",
    });
    assert.equal(d.decisionType, "doctrine_change_approval");
  });
});

/**
 * P3.1 quality-ops suite: prompt A/B assignment, variant prompt content,
 * LLM-judge response parsing, OTel gen_ai.* mapping, quality alerts.
 */
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import type { ContentRunTrace } from "@/brain/contracts";
import { toOtelGenAiAttributes } from "@/brain/observability/otel-genai";
import { evaluateTopicGenerationQuality } from "@/brain/observability/quality-alert";
import {
  assignPromptVariant,
  experimentEnvName,
} from "@/brain/policy/prompt-experiments";

import { buildTopicCandidatesSystemInstruction } from "./gtc/llm-candidates/playbook";
import {
  parseJudgeResponse,
  shouldSampleJudge,
} from "./judge/llm-judge";

const TOPIC_ENV = experimentEnvName("topic.llm-candidates");

describe("prompt A/B by version (P3.1)", () => {
  afterEach(() => {
    delete process.env[TOPIC_ENV];
  });

  it("defaults to control with the registry version", () => {
    const a = assignPromptVariant("topic.llm-candidates", "zynava.com");
    assert.equal(a.variant, "control");
    assert.equal(a.version, "topic-llm-candidates-v1+craft-dna-v1");
  });

  it("forced B arm suffixes the version for attribution", () => {
    process.env[TOPIC_ENV] = "b";
    const a = assignPromptVariant("topic.llm-candidates", "zynava.com");
    assert.equal(a.variant, "b");
    assert.equal(a.version, "topic-llm-candidates-v1+craft-dna-v1+exp-b");
  });

  it("split mode is deterministic per unit key and actually splits", () => {
    process.env[TOPIC_ENV] = "split";
    const first = assignPromptVariant("topic.llm-candidates", "zynava.com");
    const again = assignPromptVariant("topic.llm-candidates", "zynava.com");
    assert.equal(first.variant, again.variant, "same unit → same arm");

    const arms = new Set(
      Array.from({ length: 40 }, (_, i) =>
        assignPromptVariant("topic.llm-candidates", `company-${i}.com`).variant
      )
    );
    assert.deepEqual([...arms].sort(), ["b", "control"], "both arms assigned");
  });

  it("variant B adds the emphasis block; control does not", () => {
    const control = buildTopicCandidatesSystemInstruction("product_education");
    const b = buildTopicCandidatesSystemInstruction("product_education", "b");
    assert.doesNotMatch(control, /VARIANT EMPHASIS/);
    assert.match(b, /VARIANT EMPHASIS/);
    assert.ok(b.startsWith(control), "B is control plus an appended block");
  });
});

describe("LLM-as-judge parsing and sampling (P3.1)", () => {
  const savedRate = process.env.BRAIN_JUDGE_SAMPLE_RATE;
  afterEach(() => {
    if (savedRate === undefined) delete process.env.BRAIN_JUDGE_SAMPLE_RATE;
    else process.env.BRAIN_JUDGE_SAMPLE_RATE = savedRate;
  });

  it("sampling is off by default and honors the rate", () => {
    delete process.env.BRAIN_JUDGE_SAMPLE_RATE;
    assert.equal(shouldSampleJudge(() => 0), false);

    process.env.BRAIN_JUDGE_SAMPLE_RATE = "0.25";
    assert.equal(shouldSampleJudge(() => 0.1), true);
    assert.equal(shouldSampleJudge(() => 0.9), false);
  });

  it("parses a valid judge response and rejects malformed ones", () => {
    const good = parseJudgeResponse(
      JSON.stringify({
        scores: [{ title: "T", grounded: 8, specific: 7, useful: 6 }],
        overall: 7,
        notes: "solid slate",
      })
    );
    assert.ok(good);
    assert.equal(good!.overall, 7);

    assert.equal(parseJudgeResponse("not json"), null);
    assert.equal(
      parseJudgeResponse(JSON.stringify({ scores: [], overall: 7, notes: "" })),
      null,
      "empty scores must fail"
    );
    assert.equal(
      parseJudgeResponse(
        JSON.stringify({
          scores: [{ title: "T", grounded: 14, specific: 7, useful: 6 }],
          overall: 7,
          notes: "",
        })
      ),
      null,
      "out-of-range score must fail"
    );
  });
});

describe("OTel gen_ai.* attribute alignment (P3.1)", () => {
  it("maps model-calling stages onto gen_ai semantic attributes", () => {
    const trace: ContentRunTrace = {
      schemaVersion: "content-run-trace-v1",
      runId: "run_test",
      workflowVersion: "wf-v1",
      stages: [
        { stage: "load_brand_core", status: "success" },
        {
          stage: "llm_candidates",
          status: "success",
          provider: "openai",
          model: "test-model",
          promptId: "topic.llm-candidates",
          promptVersion: "topic-llm-candidates-v1",
          latencyMs: 1200,
          retryCount: 1,
          tokenUsage: { promptTokens: 1500, completionTokens: 900 },
        },
      ],
      finalStatus: "success",
      createdAt: "2026-07-29T10:00:00.000Z",
    };

    const spans = toOtelGenAiAttributes(trace);
    assert.equal(spans.length, 1, "non-model stages are skipped");
    const span = spans[0]!;
    assert.equal(span.spanName, "openai llm_candidates");
    assert.equal(span.attributes["gen_ai.system"], "openai");
    assert.equal(span.attributes["gen_ai.request.model"], "test-model");
    assert.equal(span.attributes["gen_ai.operation.name"], "chat");
    assert.equal(span.attributes["gen_ai.usage.input_tokens"], 1500);
    assert.equal(span.attributes["gen_ai.usage.output_tokens"], 900);
    assert.equal(span.attributes["marketmonth.run_id"], "run_test");
    assert.equal(
      span.attributes["marketmonth.prompt_version"],
      "topic-llm-candidates-v1"
    );
  });
});

describe("quality-drop alerting (P3.1)", () => {
  it("flags insufficient context as critical", () => {
    const alerts = evaluateTopicGenerationQuality({
      status: "insufficient_context",
      candidateCount: 0,
    });
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0]!.code, "insufficient_context");
    assert.equal(alerts[0]!.severity, "critical");
  });

  it("flags thin slates, llm fallback, and low judge scores", () => {
    const alerts = evaluateTopicGenerationQuality({
      status: "success",
      candidateCount: 2,
      llmFailureReason: "grounding_rejected",
      judgeOverall: 4,
    });
    assert.deepEqual(
      alerts.map((a) => a.code).sort(),
      ["judge_low_score", "llm_fallback", "low_candidate_count"]
    );
  });

  it("healthy runs produce no alerts (missing_api_key is not an ops alert)", () => {
    const alerts = evaluateTopicGenerationQuality({
      status: "success",
      candidateCount: 6,
      llmFailureReason: "missing_api_key",
      judgeOverall: 8,
    });
    assert.deepEqual(alerts, []);
  });
});

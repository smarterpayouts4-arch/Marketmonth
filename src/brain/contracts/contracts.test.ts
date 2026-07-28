import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildNormalizedTopic,
  contentContextPacketSchema,
  CONTENT_CONTEXT_PACKET_SCHEMA_VERSION,
  evaluationResultSchema,
  EVALUATION_RESULT_SCHEMA_VERSION,
  reviewDecisionSchema,
  REVIEW_DECISION_SCHEMA_VERSION,
  contentRunTraceSchema,
  CONTENT_RUN_TRACE_SCHEMA_VERSION,
} from "./index";
import {
  createRunContext,
  redactSecrets,
} from "@/brain/observability/trace-recorder";

describe("Content Brain contracts", () => {
  it("builds normalized topic with version", () => {
    const t = buildNormalizedTopic({
      originalInput: "  Does Magnesium Help?  ",
      objective: "product_education",
    });
    assert.equal(t.schemaVersion, "normalized-topic-v1");
    assert.equal(t.normalizedTitle, "does magnesium help?");
  });

  it("validates context packet provenance fields", () => {
    const packet = contentContextPacketSchema.parse({
      schemaVersion: CONTENT_CONTEXT_PACKET_SCHEMA_VERSION,
      companyId: "dev:zynava",
      brandCoreId: "bc_test",
      brandCoreHash: "hash",
      workflowStage: "directions",
      selectedBrandCoreSections: ["audience", "offer"],
      evidenceIds: ["ev_1"],
      claimIds: [],
      runtimeHistoryItemIds: [],
      excludedSourceTypes: ["project-knowledge"],
      freshness: "fresh",
      createdAt: new Date().toISOString(),
    });
    assert.equal(packet.companyId, "dev:zynava");
  });

  it("review decisions are discriminated", () => {
    const select = reviewDecisionSchema.parse({
      schemaVersion: REVIEW_DECISION_SCHEMA_VERSION,
      decisionType: "direction_select",
      generationId: "tgen_1",
      selectedVariationId: "var_1",
      decidedAt: new Date().toISOString(),
      actor: "human",
    });
    assert.equal(select.decisionType, "direction_select");

    const reject = reviewDecisionSchema.parse({
      schemaVersion: REVIEW_DECISION_SCHEMA_VERSION,
      decisionType: "content_reject",
      artifactId: "atom_1",
      reason: "off brand",
      decidedAt: new Date().toISOString(),
      actor: "human",
    });
    assert.equal(reject.decisionType, "content_reject");
  });

  it("evaluation result uses PASS/FAIL/WARNING", () => {
    const result = evaluationResultSchema.parse({
      schemaVersion: EVALUATION_RESULT_SCHEMA_VERSION,
      artifactId: "atom_1",
      evaluatorVersion: "draft-eval-v1",
      metrics: [
        {
          id: "brand_grounding",
          status: "PASS",
          evidence: ["ok"],
          message: "ok",
        },
      ],
      status: "PASS",
      humanReviewRequired: false,
      createdAt: new Date().toISOString(),
    });
    assert.equal(result.status, "PASS");
  });

  it("TraceRecorder builds ContentRunTrace and redacts secrets", () => {
    const ctx = createRunContext({
      workflowVersion: "directions-v1",
      inputSummary: "key=sk-abcdefghijklmnopqrstuvwxyz",
    });
    ctx.trace.stageStarted("generate", { provider: "deterministic-v1" });
    ctx.trace.stageCompleted("generate", "success", { summary: "ok" });
    const built = ctx.trace.build("success", ctx);
    assert.equal(built.schemaVersion, CONTENT_RUN_TRACE_SCHEMA_VERSION);
    assert.ok(contentRunTraceSchema.safeParse(built).success);
    assert.match(String(built.inputSummary), /REDACTED/);
    assert.equal(redactSecrets("Bearer abc.def"), "Bearer [REDACTED]");
  });
});

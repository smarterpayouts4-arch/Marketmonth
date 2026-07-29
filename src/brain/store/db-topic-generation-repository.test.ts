import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { TopicGenerationRecord } from "@/brain/content/topic-generation-record.schema";

import {
  dbRowToRecord,
  recordToDbValues,
} from "./db-topic-generation-repository";

const IDEA_SUMMARY =
  "A grounded explanation of what the approved catalog actually lists for " +
  "daily magnesium routines, written for shoppers who keep second-guessing " +
  "their choice between near-identical products on the shelf and want one " +
  "clear, evidence-backed way to decide without absorbing marketing noise.";

function sampleRecord(): TopicGenerationRecord {
  return {
    generation_id: "gen-test-0001",
    company_id: "Zynava.com",
    domain: "zynava.com",
    brand_core_id: "zynava.com",
    brand_core_version: 2,
    brand_core_hash: "hash-abc",
    mode: "manual",
    run_purpose: "product",
    input_topic: "Magnesium",
    normalized_input_topic: "Magnesium",
    master_topic: "Magnesium",
    directions: [
      {
        direction_id: "dir-1",
        position: 1,
        specific_topic: "What the label actually says about magnesium form",
        idea_summary: IDEA_SUMMARY,
        editorial_angle: "Evidence-first label walkthrough",
        audience_problem: "Shoppers cannot tell near-identical products apart",
        core_promise: "One clear grounded way to decide",
        suggested_creative_mode: "explainer",
      },
    ],
    status: "generated",
    generation_provenance: {
      brain_version: "deterministic-v1",
      prompt_version: "none",
      provider: "deterministic-v1",
    },
    record_revision: 1,
    created_at: "2026-07-29T10:00:00.000Z",
    updated_at: "2026-07-29T10:00:00.000Z",
  };
}

describe("db topic generation repository mapping", () => {
  it("round-trips a record through the jsonb payload unchanged", () => {
    const record = sampleRecord();
    const values = recordToDbValues(record);
    const restored = dbRowToRecord({ record: values.record });
    assert.deepEqual(restored, record);
  });

  it("mirrors query columns with normalized company and topic", () => {
    const values = recordToDbValues(sampleRecord());
    assert.equal(values.generationId, "gen-test-0001");
    assert.equal(values.companyId, "zynava.com");
    assert.equal(values.normalizedInputTopic, "magnesium");
    assert.equal(values.comparisonGroupId, null);
    assert.equal(values.status, "generated");
    assert.equal(values.recordRevision, 1);
    assert.equal(values.createdAt.toISOString(), "2026-07-29T10:00:00.000Z");
  });

  it("null-safe mirrors for optional fields", () => {
    const record: TopicGenerationRecord = {
      ...sampleRecord(),
      input_topic: undefined,
      normalized_input_topic: undefined,
      comparison_group_id: undefined,
    };
    const values = recordToDbValues(record);
    assert.equal(values.normalizedInputTopic, null);
    assert.equal(values.comparisonGroupId, null);
  });
});

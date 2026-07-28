import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";
import {
  compileBrandCore,
  resolveBrandCoreIdentity,
  toDirectionsBrandCoreSlice,
} from "@/brain/core";

import { INTELLIGENT_V1_VALIDATOR_VERSION } from "./constants";
import type { IntelligentDirectionsResult } from "./schema";
import { validateIntelligentDirections } from "./validate";

function loadZynavaSlice() {
  const text = readFileSync(
    path.join(process.cwd(), "data/fixtures/zynava-discovery.csv"),
    "utf8"
  );
  const context = parseFixtureCsv(text);
  assert.ok(context);
  const core = compileBrandCore(context);
  const identity = resolveBrandCoreIdentity(core);
  return toDirectionsBrandCoreSlice(core, identity);
}

const DISTINCT_SUMMARIES = [
  "Beginner framing walks first-time magnesium shoppers through absorption basics, timing habits, and what labels mean without promising clinical outcomes or medical fixes for insomnia.",
  "FAQ angle answers whether evening dosing differs from morning routines, what empty-stomach myths miss, and how to read third-party testing language on bottles carefully.",
  "Problem-solution angle maps restless nights to decision friction: confused form factors, conflicting blog advice, and unclear expectations about gentle support versus prescription sleep aids.",
  "Decision-guide angle compares glycinate versus oxide tradeoffs for calm evenings, budget constraints, and when a buyer should pause and ask a clinician before stacking supplements.",
  "Comparison angle contrasts magnesium education with melatonin marketing noise so readers see transparency cues, qualifier language, and brand positioning without hype.",
  "Trust angle shows how restricted medical wording is avoided, which proof summaries stay evidence-only, and why one approved positioning claim is enough for a cautious sleep-content brief.",
];

function buildValidResult(
  slice: ReturnType<typeof loadZynavaSlice>,
  topic: string
): IntelligentDirectionsResult {
  const problemId = slice.audiences[0].problems[0].problem_id;
  const claimId = slice.claims[0].claim_id;
  const angles = [
    "beginner_guide",
    "faq",
    "problem_solution",
    "decision_guide",
    "comparison",
    "trust_transparency",
  ];
  return {
    master_topic: {
      topic,
      reason_summary: "Relevant because it matches a primary audience sleep concern.",
      audience_problem_ids: [problemId],
      offer_ids: [slice.offers[0].offer_id],
      claim_ids: [claimId],
      evidence_ids: [],
    },
    directions: angles.map((angle, i) => ({
      direction_id: `dir_${i + 1}`,
      specific_topic: DISTINCT_SUMMARIES[i].slice(0, 80),
      idea_summary: DISTINCT_SUMMARIES[i],
      strategic_angle: angle,
      audience_problem_ids: [problemId],
      claim_ids: [claimId],
      evidence_ids: [],
      required_qualifiers: [],
      differentiation_summary: `Strategic question ${i + 1}: ${angle}`,
      non_claim_educational: false,
    })),
  };
}

describe("validateIntelligentDirections", () => {
  it("accepts grounded manual output with approved claim and no unpermitted evidence", () => {
    const slice = loadZynavaSlice();
    const topic = "Does magnesium actually help with sleep?";
    const result = buildValidResult(slice, topic);
    const report = validateIntelligentDirections({
      result,
      slice,
      lockedMasterTopic: topic,
    });
    assert.equal(report.validator_version, INTELLIGENT_V1_VALIDATOR_VERSION);
    assert.equal(report.ok, true, report.errors.join("; "));
  });

  it("rejects unknown claim ids without repairing them", () => {
    const slice = loadZynavaSlice();
    const topic = "Does magnesium actually help with sleep?";
    const result = buildValidResult(slice, topic);
    result.directions[0].claim_ids = ["claim_not_real"];
    const report = validateIntelligentDirections({
      result,
      slice,
      lockedMasterTopic: topic,
    });
    assert.equal(report.ok, false);
    assert.ok(
      report.errors.some((e) => e.includes("unknown id: claim_not_real"))
    );
  });

  it("rejects evidence not permitted by selected claims", () => {
    const slice = loadZynavaSlice();
    assert.ok(slice.evidence.length > 0);
    const topic = "Does magnesium actually help with sleep?";
    const result = buildValidResult(slice, topic);
    result.directions[0].evidence_ids = [slice.evidence[0].evidence_id];
    const report = validateIntelligentDirections({
      result,
      slice,
      lockedMasterTopic: topic,
    });
    assert.equal(report.ok, false);
    assert.ok(report.errors.some((e) => e.includes("not permitted")));
  });

  it("rejects locked master topic mismatch after normalize", () => {
    const slice = loadZynavaSlice();
    const result = buildValidResult(slice, "Completely different topic");
    const report = validateIntelligentDirections({
      result,
      slice,
      lockedMasterTopic: "Does magnesium actually help with sleep?",
    });
    assert.equal(report.ok, false);
    assert.ok(report.errors.some((e) => e.includes("Master topic mismatch")));
  });

  it("rejects directions with no audience problem ids", () => {
    const slice = loadZynavaSlice();
    const topic = "Does magnesium actually help with sleep?";
    const result = buildValidResult(slice, topic);
    result.directions[2].audience_problem_ids = [];
    const report = validateIntelligentDirections({
      result,
      slice,
      lockedMasterTopic: topic,
    });
    assert.equal(report.ok, false);
    assert.ok(
      report.errors.some((e) =>
        e.includes("must reference at least one audience problem")
      )
    );
  });
});

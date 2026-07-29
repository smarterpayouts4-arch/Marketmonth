/**
 * Golden harness (P1.5): deterministic topic generation for two known
 * companies (supplement retail + plumbing services) across all four
 * categories. Locks structural invariants — grounded support-key
 * uniqueness, no crashes, sane candidate counts — and writes a report
 * for eval diffing.
 */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  DEFAULT_TOPIC_CATEGORY_OPTIONS,
  TOPIC_CATEGORY_IDS,
  type TopicCategoryId,
} from "@/brain/content/topic-category";
import { parseFixtureCsv } from "@/brain/content/repository/parse-fixture-csv";
import type { ContentBrainContext } from "@/brain/content/types";

import { buildTopicEvidenceIndex } from "./evidence";
import { generateTopicCandidates } from "./generate-topic-candidates";
import { explainScore, SCORE_WEIGHTS } from "./gtc/score-candidate";
import { groundedSupportKey } from "./gtc/support-key";
import type { ValidatedLlmTopicCandidate } from "./gtc/llm-candidates";

const GOLDEN_FIXTURES = [
  { companyId: "zynava.com", fixture: "data/companies/zynava.com/approved.csv" },
  {
    companyId: "clearflow-plumbing",
    fixture: "data/companies/clearflow-plumbing/approved.csv",
  },
] as const;

function loadContext(fixtureRelative: string): ContentBrainContext {
  const text = readFileSync(
    path.join(process.cwd(), fixtureRelative),
    "utf8"
  );
  const ctx = parseFixtureCsv(text);
  assert.ok(ctx, `${fixtureRelative} must parse`);
  return ctx!;
}

describe("golden topic harness (two companies x four categories)", () => {
  it("generates without crashes and keeps support keys distinct", () => {
    const report: Record<string, Record<string, unknown>> = {};

    for (const { companyId, fixture } of GOLDEN_FIXTURES) {
      const context = loadContext(fixture);
      report[companyId] = {};

      for (const objective of TOPIC_CATEGORY_IDS) {
        const result = generateTopicCandidates({
          context,
          objective,
          includeIndustryResearch: false,
        });

        assert.ok(
          result.status === "success" ||
            result.status === "insufficient_context",
          `${companyId}/${objective}: unexpected status`
        );

        if (result.status === "success") {
          assert.ok(
            result.candidates.length >= 1 && result.candidates.length <= 6,
            `${companyId}/${objective}: candidate count out of range`
          );
          const keys = result.candidates.map((c) =>
            groundedSupportKey({
              subject: c.subject.label,
              subjectType: c.subject.kind,
              evidenceIds: [...c.subject.evidenceIds],
              sourceFields: c.sourceFields,
              classificationReason: c.classificationReason,
              classificationConfidence: c.classificationConfidence,
              frameHint: "golden",
              sourceType: c.subject.sourceType,
            })
          );
          assert.equal(
            new Set(keys).size,
            keys.length,
            `${companyId}/${objective}: duplicate support keys`
          );
          for (const c of result.candidates) {
            assert.ok(c.title.trim().length > 0, "empty title");
            assert.ok(c.title.length <= 90, `title too long: ${c.title}`);
            assert.ok(
              c.scoreExplanation && c.scoreExplanation.length === 8,
              "scoreExplanation missing"
            );
          }
        }

        report[companyId]![objective] = {
          status: result.status,
          completeness:
            result.status === "success" ? result.completeness : undefined,
          candidateCount:
            result.status === "success" ? result.candidates.length : 0,
          titles:
            result.status === "success"
              ? result.candidates.map((c) => c.title)
              : [],
        };
      }
    }

    // Known-good baseline, measured against a HEAD worktree probe:
    // pre-P1 the deterministic path yielded 4 distinct candidates here;
    // P1.4 (display-intent dedupe fix) raised it to 5. Lock >= 5 so a
    // dedupe/classifier regression fails loudly while a future rise to
    // 6 ("complete") stays green.
    const zynavaPe = report["zynava.com"]!.product_education as {
      status: string;
      candidateCount: number;
    };
    assert.equal(zynavaPe.status, "success");
    assert.ok(
      zynavaPe.candidateCount >= 5,
      `zynava/product_education baseline dropped: ${zynavaPe.candidateCount} < 5`
    );

    // P3.1 golden-set CI gate: every cell must hold its baselined minimum.
    // Prompt/classifier promotions that regress the golden set fail here.
    const baseline = JSON.parse(
      readFileSync(
        path.join(process.cwd(), "data/fixtures/golden-topics-baseline.json"),
        "utf8"
      )
    ) as { minCandidateCounts: Record<string, Record<string, number>> };
    for (const [companyId, categories] of Object.entries(
      baseline.minCandidateCounts
    )) {
      for (const [categoryId, minCount] of Object.entries(categories)) {
        const cell = report[companyId]?.[categoryId] as
          | { candidateCount: number }
          | undefined;
        assert.ok(cell, `baseline cell missing from run: ${companyId}/${categoryId}`);
        assert.ok(
          cell!.candidateCount >= minCount,
          `golden-set regression: ${companyId}/${categoryId} produced ${cell!.candidateCount} < baseline ${minCount} (raise coverage or intentionally re-baseline data/fixtures/golden-topics-baseline.json)`
        );
      }
    }

    const outDir = path.join(process.cwd(), "data/fixtures");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      path.join(outDir, "golden-topics-report.json"),
      `${JSON.stringify({ measuredAt: new Date().toISOString(), report }, null, 2)}\n`,
      "utf8"
    );
  });

  it("partial-accept: one LLM candidate is topped up with deterministic drafts", () => {
    const context = loadContext(GOLDEN_FIXTURES[0].fixture);
    const index = buildTopicEvidenceIndex(context);
    const firstItem = index.items[0];
    assert.ok(firstItem, "expected at least one evidence item");

    const llmCandidate: ValidatedLlmTopicCandidate = {
      title: "What the approved catalog actually lists for daily routines",
      strategicAngle: "Catalog education",
      whyItFits: "Grounded in the first indexed evidence row",
      evidenceRefs: [firstItem!.id],
    };

    const result = generateTopicCandidates({
      context,
      objective: "product_education",
      includeIndustryResearch: false,
      llmCandidates: [llmCandidate],
    });

    assert.equal(result.status, "success");
    if (result.status === "success") {
      assert.ok(
        result.candidates.length > 1,
        "deterministic top-up must add candidates beyond the single LLM one"
      );
      assert.ok(
        result.candidates.some((c) => c.titleSource === "llm-generated"),
        "LLM candidate must survive the merged slate"
      );
      assert.ok(
        result.candidates.some((c) => c.titleSource === "deterministic-v2"),
        "deterministic top-up candidates must be present"
      );
    }
  });
});

describe("score-weight invariants", () => {
  it("weights sum to 1 and explainScore covers every component", () => {
    const sum = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `weights sum ${sum}`);

    const explanation = explainScore({
      objectiveAlignment: 0.8,
      subjectKindFit: 0.7,
      contextGrounding: 0.6,
      audienceRelevance: 0.5,
      evidenceGrounding: 0.9,
      specificity: 0.4,
      novelty: 0.95,
      clarity: 0.8,
      overall: 0.71,
    });
    assert.equal(explanation.length, Object.keys(SCORE_WEIGHTS).length);
    for (const key of Object.keys(SCORE_WEIGHTS)) {
      assert.ok(
        explanation.some((line) => line.startsWith(`${key}:`)),
        `missing component ${key}`
      );
    }
  });
});

describe("category parity", () => {
  it("product UI options cover all four canonical categories", () => {
    assert.deepEqual(
      [...DEFAULT_TOPIC_CATEGORY_OPTIONS].sort(),
      [...TOPIC_CATEGORY_IDS].sort()
    );
    const all: TopicCategoryId[] = [
      "customer_questions",
      "product_education",
      "trust_proof",
      "offers_conversion",
    ];
    assert.deepEqual([...TOPIC_CATEGORY_IDS].sort(), all.sort());
  });
});

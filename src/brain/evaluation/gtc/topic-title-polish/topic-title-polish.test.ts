import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { TopicCandidate } from "../../topic-candidate-types";
import { isMalformedSubjectLabel } from "../../subjects/subject-label";
import {
  approvedAliasesForCandidate,
  buildTopicTitlePolishSystemPrompt,
  candidateEligibleForPolish,
  subjectPreservedWithAliases,
  validatePolishedTitle,
  TOPIC_TITLE_POLISH_VERSION,
} from "./index";
import { polishTopicCandidateTitles } from "./polish";

function stubCandidate(
  overrides: Partial<TopicCandidate> & Pick<TopicCandidate, "topicId" | "title">
): TopicCandidate {
  return {
    rank: 1,
    originalTitle: overrides.title,
    titleSource: "deterministic-v2",
    objective: "brand_awareness",
    audience: "shoppers",
    audiencePain: "pain",
    strategicAngle: "angle",
    relevanceReasons: [],
    evidenceIds: ["e1"],
    subject: {
      label: "Supplement search",
      kind: "platform_capability",
      sourceField: "products",
      evidenceIds: ["e1"],
      classificationConfidence: "high",
    },
    subjectKind: "platform_capability",
    sourceFields: ["products"],
    classificationReason: "test",
    classificationConfidence: "high",
    score: {
      objectiveAlignment: 1,
      subjectKindFit: 1,
      contextGrounding: 1,
      audienceRelevance: 1,
      evidenceGrounding: 1,
      specificity: 1,
      novelty: 1,
      clarity: 1,
      overall: 1,
    },
    scoreVersion: "topic-candidate-score-v2",
    recommended: true,
    ...overrides,
  };
}

describe("topic-title-polish playbook + validation", () => {
  it("playbook encodes Hooked trigger craft and hard bans", () => {
    const system = buildTopicTitlePolishSystemPrompt("brand_awareness");
    assert.match(system, /External Trigger/i);
    assert.match(system, /curiosity loop/i);
    assert.match(system, /doctor recommended/i);
    assert.match(system, /brand_awareness/i);
    assert.match(system, /Do NOT use product-label-check/i);
    assert.equal(system.includes("Penguin"), false);
  });

  it("rejects brand_awareness product-education shell leaks", () => {
    const c = stubCandidate({
      topicId: "tc_1",
      title: "Why Supplement search matters for Zynava shoppers",
      objective: "brand_awareness",
    });
    const result = validatePolishedTitle({
      candidate: c,
      polishInput: {
        candidateId: "tc_1",
        originalTitle: c.title,
        primaryLabel: "Supplement search",
        primaryKind: "platform_capability",
        allowedFacts: ["Supplement search", "Zynava"],
        approvedAliases: approvedAliasesForCandidate(c, "Zynava"),
        forbiddenEntities: [],
      },
      polishedTitle: "Before you buy, check the label on Supplement search",
      otherAcceptedTitles: [],
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.reason, /product-education shell/i);
    }
  });

  it("allows approved alias subject preservation", () => {
    assert.equal(
      subjectPreservedWithAliases(
        "Supplement search",
        "Why finding supplement information gets harder across retailers",
        ["Supplement search", "finding supplement information", "supplement search"]
      ),
      true
    );
  });

  it("malformed subjects are not polish-eligible", () => {
    assert.equal(isMalformedSubjectLabel("Shoppers comparing"), true);
    assert.equal(
      isMalformedSubjectLabel("supplement prices and formulations in on"),
      true
    );
    const c = stubCandidate({
      topicId: "tc_bad",
      title: "Bad",
      subject: {
        label: "Shoppers comparing",
        kind: "audience_problem",
        sourceField: "audience",
        evidenceIds: [],
        classificationConfidence: "low",
      },
      subjectKind: "audience_problem",
    });
    assert.equal(candidateEligibleForPolish(c), false);
  });

  it("provider off keeps deterministic-v2 and originalTitle with no failure reason", async () => {
    const prev = process.env.TOPIC_TITLE_POLISH_PROVIDER;
    process.env.TOPIC_TITLE_POLISH_PROVIDER = "deterministic-only";
    try {
      const c = stubCandidate({
        topicId: "tc_a",
        title: "Why Supplement search matters for Zynava shoppers",
        originalTitle: "Why Supplement search matters for Zynava shoppers",
      });
      const out = await polishTopicCandidateTitles({
        generation: {
          status: "success",
          completeness: "limited",
          candidates: [c],
          warnings: [],
        },
        context: {
          brandName: "Zynava",
          domain: "zynava.com",
          website: "https://zynava.com",
          products: ["Supplement search"],
          services: [],
          indexedProducts: [],
          contentOpportunities: [],
          evidenceById: {},
          contextVersion: "test",
          source: "fixture",
        },
        objective: "brand_awareness",
      });
      assert.equal(out.generation.status, "success");
      assert.equal(out.titlePolishFailureReason, undefined);
      if (out.generation.status !== "success") return;
      assert.equal(out.generation.candidates[0]?.titleSource, "deterministic-v2");
      assert.equal(
        out.generation.candidates[0]?.originalTitle,
        "Why Supplement search matters for Zynava shoppers"
      );
      assert.equal(
        out.generation.candidates[0]?.title,
        out.generation.candidates[0]?.originalTitle
      );
      assert.equal(TOPIC_TITLE_POLISH_VERSION, "topic-title-polish-v1");
    } finally {
      if (prev === undefined) delete process.env.TOPIC_TITLE_POLISH_PROVIDER;
      else process.env.TOPIC_TITLE_POLISH_PROVIDER = prev;
    }
  });

  it("enabled polish without API key surfaces missing_api_key + openai-fallback", async () => {
    const prevProvider = process.env.TOPIC_TITLE_POLISH_PROVIDER;
    const prevKey = process.env.OPENAI_API_KEY;
    process.env.TOPIC_TITLE_POLISH_PROVIDER = "openai";
    delete process.env.OPENAI_API_KEY;
    try {
      const c = stubCandidate({
        topicId: "tc_a",
        title: "Why Supplement search matters for Zynava shoppers",
        originalTitle: "Why Supplement search matters for Zynava shoppers",
      });
      const out = await polishTopicCandidateTitles({
        generation: {
          status: "success",
          completeness: "limited",
          candidates: [c],
          warnings: [],
        },
        context: {
          brandName: "Zynava",
          domain: "zynava.com",
          website: "https://zynava.com",
          products: ["Supplement search"],
          services: [],
          indexedProducts: [],
          contentOpportunities: [],
          evidenceById: {},
          contextVersion: "test",
          source: "fixture",
        },
        objective: "brand_awareness",
      });
      assert.equal(out.titlePolishFailureReason, "missing_api_key");
      assert.equal(out.generation.status, "success");
      if (out.generation.status !== "success") return;
      assert.equal(out.generation.candidates[0]?.titleSource, "openai-fallback");
      assert.equal(
        out.generation.candidates[0]?.titlePolishFailureReason,
        "missing_api_key"
      );
      assert.equal(
        out.generation.candidates[0]?.title,
        "Why Supplement search matters for Zynava shoppers"
      );
    } finally {
      if (prevProvider === undefined) delete process.env.TOPIC_TITLE_POLISH_PROVIDER;
      else process.env.TOPIC_TITLE_POLISH_PROVIDER = prevProvider;
      if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = prevKey;
    }
  });
});

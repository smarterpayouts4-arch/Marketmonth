/**
 * Mocked-LLM pipeline tests (P1.5): success path, repair retry, and the
 * fallback matrix — none of these touch the network.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import type { ContentBrainContext } from "@/brain/content/types";

import type { TopicEvidenceItem } from "../../evidence/types";
import { fetchLlmTopicCandidates } from "./fetch";
import {
  setTopicCandidatesLlmAdapterForTests,
  type TopicCandidatesLlmCallArgs,
} from "./openai-adapter";

function evidenceItem(
  overrides: Partial<TopicEvidenceItem> & Pick<TopicEvidenceItem, "id">
): TopicEvidenceItem {
  return {
    recordType: "signal",
    field: "indexedProduct",
    value: "Omega-3 Fish Oil",
    normalizedText: "Omega-3 Fish Oil supports label comparison",
    sourceUrl: "https://example.com/products",
    evidenceType: "observed",
    confidence: "high",
    qualityScore: 0.9,
    signalType: "indexed_product",
    ...overrides,
  };
}

const context: ContentBrainContext = {
  brandName: "Test Brand",
  domain: "example.com",
  website: "https://example.com",
  description: "A supplement shop",
  valueProposition: "Clear labels",
  brandVoice: "Plain",
  audience: "Shoppers",
  products: [],
  services: [],
  indexedProducts: [],
  contentOpportunities: [],
  evidenceById: {},
  contextVersion: "test-v1",
  source: "fixture",
};

const items = [evidenceItem({ id: "ev_omega" })];

const validCandidateJson = JSON.stringify({
  candidates: [
    {
      title: "What Omega-3 label language means on this catalog",
      strategicAngle: "Label education",
      whyItFits: "Grounded in indexed product evidence",
      evidenceRefs: ["E01"],
      hook: null,
      audienceQuestion: null,
      suggestedFormats: null,
      platformFit: null,
      funnelRole: null,
      itchType: "missing_detail",
      confidence: 0.8,
    },
  ],
});

let prevKey: string | undefined;

describe("fetchLlmTopicCandidates with mocked adapter", () => {
  beforeEach(() => {
    prevKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "test-key-not-real";
  });
  afterEach(() => {
    setTopicCandidatesLlmAdapterForTests(null);
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevKey;
  });

  it("returns validated candidates on mocked success (no fallback)", async () => {
    let calls = 0;
    setTopicCandidatesLlmAdapterForTests(async () => {
      calls += 1;
      return {
        ok: true,
        raw: validCandidateJson,
        tokenUsage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };
    });
    const result = await fetchLlmTopicCandidates({
      context,
      categoryId: "product_education",
      evidenceItems: items,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.candidates.length, 1);
      assert.equal(result.validatorVersion, "topic-llm-validate-v2");
      assert.equal(result.repairUsed, undefined);
      assert.equal(result.tokenUsage?.totalTokens, 150);
    }
    assert.equal(calls, 1);
  });

  it("repair retry recovers from invalid JSON on the first attempt", async () => {
    let calls = 0;
    const prompts: string[] = [];
    setTopicCandidatesLlmAdapterForTests(async (args: TopicCandidatesLlmCallArgs) => {
      calls += 1;
      prompts.push(args.user);
      if (calls === 1) return { ok: true, raw: "not json at all" };
      return { ok: true, raw: validCandidateJson };
    });
    const result = await fetchLlmTopicCandidates({
      context,
      categoryId: "product_education",
      evidenceItems: items,
    });
    assert.equal(calls, 2);
    assert.match(prompts[1]!, /REPAIR PASS/);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.repairUsed, true);
      assert.equal(result.candidates.length, 1);
    }
  });

  it("repair retry recovers from an all-rejected first slate", async () => {
    let calls = 0;
    setTopicCandidatesLlmAdapterForTests(async () => {
      calls += 1;
      if (calls === 1) {
        return {
          ok: true,
          raw: JSON.stringify({
            candidates: [
              {
                title: "Too short",
                strategicAngle: "x",
                whyItFits: "y",
                evidenceRefs: ["E01"],
              },
            ],
          }),
        };
      }
      return { ok: true, raw: validCandidateJson };
    });
    const result = await fetchLlmTopicCandidates({
      context,
      categoryId: "product_education",
      evidenceItems: items,
    });
    assert.equal(calls, 2);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.repairUsed, true);
  });

  it("fallback matrix: transport failure surfaces without a repair pass", async () => {
    let calls = 0;
    setTopicCandidatesLlmAdapterForTests(async () => {
      calls += 1;
      return { ok: false, reason: "timeout", detail: "socket timeout" };
    });
    const result = await fetchLlmTopicCandidates({
      context,
      categoryId: "product_education",
      evidenceItems: items,
    });
    // Transport retries live inside the shared client; fetch does not
    // burn a repair pass on them.
    assert.equal(calls, 1);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "timeout");
  });

  it("fallback matrix: persistent schema mismatch fails with reason after repair", async () => {
    let calls = 0;
    setTopicCandidatesLlmAdapterForTests(async () => {
      calls += 1;
      return { ok: true, raw: JSON.stringify({ wrong: "shape" }) };
    });
    const result = await fetchLlmTopicCandidates({
      context,
      categoryId: "product_education",
      evidenceItems: items,
    });
    assert.equal(calls, 2);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "schema_mismatch");
      assert.equal(result.repairUsed, true);
    }
  });

  it("fallback matrix: persistent rejection reports grounding_rejected with taxonomy", async () => {
    setTopicCandidatesLlmAdapterForTests(async () => ({
      ok: true,
      raw: JSON.stringify({
        candidates: [
          {
            title: "How unrelated quantum computing hardware works today",
            strategicAngle: "Off-topic",
            whyItFits: "Not grounded",
            evidenceRefs: ["E01"],
          },
        ],
      }),
    }));
    const result = await fetchLlmTopicCandidates({
      context,
      categoryId: "product_education",
      evidenceItems: items,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.reason, "grounding_rejected");
      assert.equal(result.repairUsed, true);
      assert.ok(result.rejections && result.rejections.length > 0);
      assert.equal(result.rejections![0]!.code, "subject_mismatch");
    }
  });

  it("fallback matrix: no evidence short-circuits before any call", async () => {
    let calls = 0;
    setTopicCandidatesLlmAdapterForTests(async () => {
      calls += 1;
      return { ok: true, raw: validCandidateJson };
    });
    const result = await fetchLlmTopicCandidates({
      context,
      categoryId: "product_education",
      evidenceItems: [],
    });
    assert.equal(calls, 0);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "no_eligible_candidates");
  });
});

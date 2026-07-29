import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_TOPIC_CATEGORY_OPTIONS,
  TOPIC_CATEGORY_DEFINITIONS,
  TOPIC_CATEGORY_IDS,
  isTopicCategoryId,
  parseTopicCategory,
  preferredFieldsForCategory,
  topicCategoryPurposeLine,
} from "./topic-category";

describe("topic categories", () => {
  it("exposes exactly the four marketing jobs", () => {
    assert.deepEqual(
      [...TOPIC_CATEGORY_IDS],
      ["customer_questions", "product_education", "trust_proof", "offers_conversion"]
    );
    assert.equal(DEFAULT_TOPIC_CATEGORY_OPTIONS.length, 4);
  });

  it("defines a label, hint, purpose, and preferred fields for every category", () => {
    for (const id of TOPIC_CATEGORY_IDS) {
      const def = TOPIC_CATEGORY_DEFINITIONS[id];
      assert.equal(def.id, id);
      assert.ok(def.label.length > 0, `${id} label`);
      assert.ok(def.hint.length > 0, `${id} hint`);
      assert.ok(def.purpose.length > 20, `${id} purpose too thin for a prompt`);
      assert.ok(def.preferredFields.length > 0, `${id} preferred fields`);
    }
  });

  /**
   * Categories are jobs, not funnel stages, so two of them must never share a
   * preferred-field ordering — that would make evidence selection identical and
   * collapse them into duplicate topics.
   */
  it("gives each category a distinct evidence preference", () => {
    const seen = new Set<string>();
    for (const id of TOPIC_CATEGORY_IDS) {
      const key = preferredFieldsForCategory(id).join("|");
      assert.equal(seen.has(key), false, `${id} duplicates another category`);
      seen.add(key);
    }
  });

  it("accepts the four ids and rejects unknown values", () => {
    for (const id of TOPIC_CATEGORY_IDS) {
      assert.deepEqual(parseTopicCategory(id), { ok: true, value: id });
      assert.equal(isTopicCategoryId(id), true);
    }
    assert.equal(isTopicCategoryId("brand_awareness"), false);
    assert.equal(parseTopicCategory("nonsense").ok, false);
    assert.equal(parseTopicCategory(42).ok, false);
  });

  it("treats absent input as valid so callers choose their own default", () => {
    for (const empty of [undefined, null, ""]) {
      assert.deepEqual(parseTopicCategory(empty), { ok: true, value: undefined });
    }
  });

  /**
   * Stored Idea Lab runs hold retired MarketingFocus values. They must keep
   * resolving rather than erroring, or old history stops rendering.
   */
  it("migrates retired MarketingFocus values instead of failing", () => {
    const cases: Array<[string, string]> = [
      ["decision_support", "customer_questions"],
      ["trust_authority", "trust_proof"],
      ["product_education", "product_education"],
      ["brand_awareness", "offers_conversion"],
      ["value_proposition", "offers_conversion"],
    ];
    for (const [legacy, expected] of cases) {
      const parsed = parseTopicCategory(legacy);
      assert.equal(parsed.ok, true, legacy);
      assert.ok(parsed.ok && parsed.value === expected, `${legacy} -> ${expected}`);
    }
  });

  it("records what a migrated value came from", () => {
    const parsed = parseTopicCategory("trust_authority");
    assert.ok(parsed.ok && parsed.migratedFrom === "trust_authority");
    const direct = parseTopicCategory("trust_proof");
    assert.ok(direct.ok && direct.migratedFrom === undefined);
  });

  it("returns a prompt-ready purpose line", () => {
    for (const id of TOPIC_CATEGORY_IDS) {
      assert.equal(topicCategoryPurposeLine(id), TOPIC_CATEGORY_DEFINITIONS[id].purpose);
    }
  });
});

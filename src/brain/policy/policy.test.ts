import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  IDEA_LAB_DIRECTIONS_PROVIDER,
  PRODUCT_ATOM_PREFER_LLM,
  PRODUCT_DEFAULT_DIRECTIONS_PROVIDER,
  selectDirectionsProvider,
  selectIdeaLabDirectionsProvider,
} from "@/brain/policy/provider-policy";
import { MODEL_REGISTRY, resolveModel } from "@/brain/policy/model-registry";
import { DEFAULT_FIXTURE_RELATIVE } from "@/brain/content/repository/default-fixture";

describe("Content Brain policy", () => {
  it("defaults product and Idea Lab directions to deterministic-v1", () => {
    assert.equal(PRODUCT_DEFAULT_DIRECTIONS_PROVIDER, "deterministic-v1");
    assert.equal(IDEA_LAB_DIRECTIONS_PROVIDER, "deterministic-v1");
    assert.equal(selectDirectionsProvider().id, "deterministic-v1");
    assert.equal(selectIdeaLabDirectionsProvider().id, "deterministic-v1");
  });

  it("defaults product atom preferLlm true (constrained LLM path)", () => {
    assert.equal(PRODUCT_ATOM_PREFER_LLM, true);
  });

  it("resolves models from registry defaults", () => {
    assert.equal(MODEL_REGISTRY.directionsIntelligent.default, "gpt-5-nano");
    assert.ok(resolveModel("directionsIntelligent").length > 0);
  });

  it("uses single relative fixture ingest path", () => {
    assert.equal(DEFAULT_FIXTURE_RELATIVE, "data/companies/zynava.com/approved.csv");
  });
});

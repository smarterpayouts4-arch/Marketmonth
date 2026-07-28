import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertPromptRegistryValid,
  getPromptEntry,
  PROMPT_REGISTRY,
  type PromptRegistryEntry,
} from "./prompt-registry";
import { resolveModel } from "./model-registry";
import { selectDirectionsProvider } from "./provider-policy";

describe("prompt + policy registry", () => {
  it("has unique ids and versions", () => {
    assert.doesNotThrow(() => assertPromptRegistryValid());
    for (const e of PROMPT_REGISTRY) {
      assert.ok(e.version.length > 0, e.id);
      assert.ok(e.promptModule.length > 0, e.id);
    }
  });

  it("fails on duplicate prompt ids", () => {
    const dup: PromptRegistryEntry[] = [
      ...PROMPT_REGISTRY,
      { ...PROMPT_REGISTRY[0] },
    ];
    assert.throws(() => assertPromptRegistryValid(dup), /Duplicate prompt ID/);
  });

  it("unknown prompt id fails closed", () => {
    assert.throws(() => getPromptEntry("not.real"), /Unknown prompt id/);
  });

  it("unknown provider fails closed", () => {
    assert.throws(() => selectDirectionsProvider("gpt-magic"), /Unknown/);
  });

  it("unknown model policy fails closed", () => {
    assert.throws(() => resolveModel("nope"), /Unknown model-policy/);
  });
});

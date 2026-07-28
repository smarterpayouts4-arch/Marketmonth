import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isContentPromptInspectorEnabled } from "./prompt-inspector";

describe("isContentPromptInspectorEnabled", () => {
  it("defaults on in development", () => {
    assert.equal(
      isContentPromptInspectorEnabled({ NODE_ENV: "development" }),
      true
    );
  });

  it("defaults off in production", () => {
    assert.equal(
      isContentPromptInspectorEnabled({ NODE_ENV: "production" }),
      false
    );
  });

  it("honors explicit true in production", () => {
    assert.equal(
      isContentPromptInspectorEnabled({
        NODE_ENV: "production",
        CONTENT_PROMPT_INSPECTOR: "true",
      }),
      true
    );
  });

  it("honors explicit false in development", () => {
    assert.equal(
      isContentPromptInspectorEnabled({
        NODE_ENV: "development",
        CONTENT_PROMPT_INSPECTOR: "false",
      }),
      false
    );
  });
});

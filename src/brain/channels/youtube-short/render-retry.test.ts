import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { priorSucceededAssetFields } from "./in-flight-guard";

describe("failed regeneration preserves previous successful asset", () => {
  it("merges prior URL into failed voice state shape", () => {
    const prior = {
      status: "succeeded" as const,
      assetUrl: "https://cdn.example.com/good.mp3",
      assetRef: "imagekit://abc",
      durationSeconds: 3.2,
      scriptUsed: "Hello",
    };
    const failed = {
      status: "failed" as const,
      ...priorSucceededAssetFields(prior),
      scriptUsed: "Hello",
      error: {
        code: "short_voice.provider_failed",
        message: "boom",
        retryable: true,
      },
    };
    assert.equal(failed.status, "failed");
    assert.equal(failed.assetUrl, "https://cdn.example.com/good.mp3");
    assert.equal(failed.durationSeconds, 3.2);
  });
});

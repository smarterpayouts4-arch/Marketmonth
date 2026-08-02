import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkInFlight,
  nextAttempt,
  priorSucceededAssetFields,
  RENDER_TIMEOUT_MS,
} from "./in-flight-guard";

describe("checkInFlight", () => {
  it("allows when not running", () => {
    assert.equal(checkInFlight({ status: "succeeded" }, "voice").ok, true);
    assert.equal(checkInFlight(undefined, "image").ok, true);
  });

  it("conflicts when running within window", () => {
    const now = Date.now();
    const startedAt = new Date(now - 1_000).toISOString();
    const result = checkInFlight(
      { status: "running", startedAt },
      "voice",
      now
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.kind, "conflict");
      assert.equal(result.status, 409);
    }
  });

  it("times out when running past window", () => {
    const now = Date.now();
    const startedAt = new Date(
      now - RENDER_TIMEOUT_MS.voice - 1_000
    ).toISOString();
    const result = checkInFlight(
      { status: "running", startedAt },
      "voice",
      now
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.kind, "timed_out");
    }
  });
});

describe("priorSucceededAssetFields", () => {
  it("preserves URL from prior succeeded asset", () => {
    const fields = priorSucceededAssetFields({
      status: "succeeded",
      assetUrl: "https://cdn.example.com/a.mp3",
      assetRef: "ref",
      durationSeconds: 2,
    });
    assert.equal(fields.assetUrl, "https://cdn.example.com/a.mp3");
    assert.equal(fields.durationSeconds, 2);
  });

  it("preserves URL from stale asset", () => {
    const fields = priorSucceededAssetFields({
      status: "stale",
      assetUrl: "https://cdn.example.com/old.mp4",
    });
    assert.equal(fields.assetUrl, "https://cdn.example.com/old.mp4");
  });

  it("skips failed without URL", () => {
    const fields = priorSucceededAssetFields({
      status: "failed",
      assetUrl: "https://cdn.example.com/should-not-keep.mp3",
    });
    assert.equal(fields.assetUrl, undefined);
  });
});

describe("nextAttempt", () => {
  it("increments attempt", () => {
    assert.equal(nextAttempt(undefined), 1);
    assert.equal(nextAttempt({ attempt: 2 }), 3);
  });
});

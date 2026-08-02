import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkInFlight, RENDER_TIMEOUT_MS } from "./in-flight-guard";

describe("duplicate render while running → conflict", () => {
  it("rejects a second request when status is running within timeout", () => {
    const now = Date.parse("2026-08-02T12:00:00.000Z");
    const result = checkInFlight(
      {
        status: "running",
        startedAt: new Date(now - 1_000).toISOString(),
      },
      "image",
      now
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.kind, "conflict");
      assert.equal(result.status, 409);
      assert.equal(result.code, "short_image.already_running");
    }
  });

  it("marks timed-out running so retry can proceed", () => {
    const now = Date.parse("2026-08-02T12:00:00.000Z");
    const result = checkInFlight(
      {
        status: "running",
        startedAt: new Date(now - RENDER_TIMEOUT_MS.image - 1).toISOString(),
      },
      "image",
      now
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.kind, "timed_out");
      assert.equal(result.code, "short_image.stale_running");
    }
  });
});

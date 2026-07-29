import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { verifyClaimParity } from "./verify-claim-parity";

describe("claim parity", () => {
  it("keeps landing, metadata, JSON-LD, and llms aligned to approved public truth", () => {
    const result = verifyClaimParity();
    assert.equal(
      result.ok,
      true,
      result.errors.join("\n") || "claim parity failed"
    );
  });
});

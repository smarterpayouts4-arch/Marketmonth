import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isPlaceholderRetrievedAt,
  looksClipped,
  sanitizeEvidenceText,
  shouldRejectEvidenceText,
} from "./sanitize";

describe("sanitizeEvidenceText", () => {
  it("rejects schema.org / script fragments", () => {
    assert.equal(shouldRejectEvidenceText('{"@context":"https://schema.org"}'), true);
    assert.equal(sanitizeEvidenceText("<script>alert(1)</script>"), null);
    assert.equal(shouldRejectEvidenceText("application/ld+json blob"), true);
  });

  it("rejects placeholder retrieved_at", () => {
    assert.equal(isPlaceholderRetrievedAt("1970-01-01T00:00:00.000Z"), true);
    assert.equal(isPlaceholderRetrievedAt("2026-07-28T21:50:22.636Z"), false);
  });

  it("detects clipped brand-profile style endings", () => {
    assert.equal(
      looksClipped(
        "Zynava shows matching supplement options and prices from multiple ."
      ),
      true
    );
    assert.equal(
      looksClipped(
        "Educational guidance. We"
      ),
      true
    );
    assert.equal(
      looksClipped(
        "ClearFlow Plumbing serves homeowners with flat-rate pricing."
      ),
      false
    );
  });

  it("returns cleaned usable prose", () => {
    const out = sanitizeEvidenceText(
      "  Licensed plumbers · flat-rate quotes before work starts.  "
    );
    assert.equal(out, "Licensed plumbers · flat-rate quotes before work starts.");
  });
});

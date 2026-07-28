import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isCompleteSentence,
  stripLeadingBrandName,
  toDisplaySentence,
} from "./complete-sentence";

describe("complete-sentence", () => {
  it("rejects JSON and incomplete dangling phrases", () => {
    assert.equal(isCompleteSentence('{"@context":"https://schema'), false);
    assert.equal(isCompleteSentence("transparent comparison of"), false);
  });

  it("strips leading brand names before rewrite", () => {
    assert.equal(
      stripLeadingBrandName(
        "Zynava simplifies supplement decisions for shoppers.",
        "Zynava"
      ),
      "Simplifies supplement decisions for shoppers."
    );
  });

  it("prefers complete sentences and omits junk", () => {
    assert.equal(
      toDisplaySentence(
        "Zynava simplifies supplement decisions by providing AI-driven comparisons.",
        { businessName: "Zynava" }
      ),
      "Simplifies supplement decisions by providing AI-driven comparisons."
    );
    assert.equal(
      toDisplaySentence('Offers: {"@context":"https://schema'),
      null
    );
  });
});

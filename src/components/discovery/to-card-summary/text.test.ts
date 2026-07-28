import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { truncateAtSentence } from "./text";

describe("truncateAtSentence", () => {
  it("returns full text under the limit", () => {
    const result = truncateAtSentence("Short sentence.", 80);
    assert.equal(result.text, "Short sentence.");
    assert.equal(result.wasTruncated, false);
  });

  it("prefers a sentence boundary", () => {
    const source =
      "AI-powered supplement search and price-comparison engine. Choose your ingredient, form, diet, and budget, Zynava finds matching products.";
    const result = truncateAtSentence(source, 70);
    assert.equal(result.wasTruncated, true);
    assert.ok(result.text.endsWith("…"));
    assert.ok(result.text.includes("engine."));
    assert.ok(!result.text.includes("Zyn…"));
    assert.ok(!/\sZyn…$/.test(result.text));
  });

  it("falls back to a whole-word boundary", () => {
    const source =
      "Wordy unfinished clause without punctuation that keeps going for a while";
    const result = truncateAtSentence(source, 40);
    assert.equal(result.wasTruncated, true);
    assert.ok(result.text.endsWith("…"));
    assert.ok(!result.text.includes("goi…"));
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clipToWordBoundary,
  endAtReadableBoundary,
  readableUrlLabel,
  stripLeadingHeadingRun,
  trimDanglingPunctuation,
} from "./text-display";

describe("stripLeadingHeadingRun", () => {
  it("drops three or more stacked headings", () => {
    assert.equal(
      stripLeadingHeadingRun(
        "About ZYNAVA Why ZYNAVA Exists The supplement market presents a paradox for shoppers."
      ),
      "The supplement market presents a paradox for shoppers."
    );
  });

  it("keeps a short branded tagline intact", () => {
    const tagline = "ZYNAVA Free AI-powered supplement search and price comparison.";
    assert.equal(stripLeadingHeadingRun(tagline), tagline);
  });

  it("leaves ordinary sentences alone", () => {
    for (const sentence of [
      "We simplify supplement decisions with three free tools.",
      "Choose your ingredient, form, dietary needs, and budget.",
    ]) {
      assert.equal(stripLeadingHeadingRun(sentence), sentence);
    }
  });
});

describe("clipToWordBoundary", () => {
  it("never splits a word", () => {
    const out = clipToWordBoundary(
      "we have more options than ever before, yet individuals often feel more confused, not less",
      86
    );
    assert.ok(!out.endsWith("le"), out);
    assert.ok(out.length <= 86);
    assert.ok(!/[,;:]$/.test(out));
  });

  it("returns short text unchanged", () => {
    assert.equal(clipToWordBoundary("Magnesium glycinate", 160), "Magnesium glycinate");
  });
});

describe("endAtReadableBoundary", () => {
  it("falls back to the last clause instead of a dangling word", () => {
    assert.equal(
      endAtReadableBoundary(
        "The supplement market presents a paradox: we have more options than ever before, yet individuals often feel more confused, not"
      ),
      "The supplement market presents a paradox: we have more options than ever before, yet individuals often feel more confused"
    );
  });

  it("keeps a complete sentence untouched", () => {
    const sentence = "ZYNAVA is committed to transparency, accuracy, and independence.";
    assert.equal(endAtReadableBoundary(sentence), sentence);
  });
});

describe("readableUrlLabel", () => {
  it("labels a bare link and ignores prose", () => {
    assert.equal(
      readableUrlLabel("https://www.linkedin.com/company/zynava"),
      "linkedin.com/company/zynava"
    );
    assert.equal(readableUrlLabel("Visit our site at example.com for details"), null);
  });
});

describe("trimDanglingPunctuation", () => {
  it("removes a trailing comma or dash", () => {
    assert.equal(trimDanglingPunctuation("more options than ever before,"), "more options than ever before");
    assert.equal(trimDanglingPunctuation("independence and transparency —"), "independence and transparency");
  });
});

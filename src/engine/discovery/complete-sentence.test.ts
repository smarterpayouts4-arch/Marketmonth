import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { stripLeadingHeadingRun } from "@/lib/discovery/text-display";

import {
  isCompleteSentence,
  stripLeadingBrandName,
  toDisplaySentence,
  truncateForEmbed,
  truncatePhrase,
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

describe("truncateForEmbed", () => {
  it("prefers the first complete sentence over a hard clip", () => {
    // The pre-fix `.slice(0, 120)` produced "…participating retailers a."
    assert.equal(
      truncateForEmbed(
        "Choose your ingredient, form, dietary needs, and budget. Zynava finds matching products across participating retailers and shows current prices.",
        120
      ),
      "Choose your ingredient, form, dietary needs, and budget."
    );
  });

  it("never ends an embed on a dangling function word", () => {
    const out = truncateForEmbed(
      "Our team supports shoppers with clear comparisons across a wide range of retailers and brands.",
      44
    );
    assert.ok(out === null || !/\b(a|an|the|of|and|to|for|with)\.$/i.test(out));
  });

  it("omits rather than cut mid-clause when the window has no boundary", () => {
    assert.equal(
      truncateForEmbed(
        "About ZYNAVAWhy ZYNAVA ExistsThe supplement market presents a paradox with far more options than most shoppers can reasonably evaluate on their own",
        60
      ),
      null
    );
  });

  it("returns short complete input unchanged apart from terminal punctuation", () => {
    assert.equal(
      truncateForEmbed("Compare supplement prices with confidence", 160),
      "Compare supplement prices with confidence."
    );
  });

  it("rejects structured-data noise", () => {
    assert.equal(truncateForEmbed('{"@context":"https://schema.org"}', 120), null);
  });

  it("drops a stacked-heading prefix before the real sentence", () => {
    assert.equal(
      truncateForEmbed(
        "About ZYNAVA Why ZYNAVA Exists The supplement market presents a paradox: we have more options than ever before, yet individuals often feel more confused, not less.",
        140
      ),
      "The supplement market presents a paradox: we have more options than ever before, yet individuals often feel more confused, not less."
    );
  });
});

describe("stripLeadingHeadingRun", () => {
  it("leaves ordinary sentences alone", () => {
    for (const sentence of [
      "We simplify supplement decisions with three free tools.",
      "Choose your ingredient, form, dietary needs, and budget.",
      "Magnesium glycinate supports evening routines for most adults.",
    ]) {
      assert.equal(stripLeadingHeadingRun(sentence), sentence);
    }
  });

  it("leaves an all-caps line alone when no prose follows", () => {
    assert.equal(stripLeadingHeadingRun("PRIVACY POLICY"), "PRIVACY POLICY");
  });
});

describe("truncatePhrase", () => {
  it("trims at a word boundary without adding punctuation", () => {
    const out = truncatePhrase(
      "Magnesium glycinate capsules for evening routines",
      30
    );
    assert.ok(out && !/[.!?]$/.test(out));
    assert.ok(out && out.length <= 30);
    assert.ok(out && !out.endsWith("for"));
  });

  it("strips a trailing period from a short phrase", () => {
    assert.equal(truncatePhrase("Magnesium glycinate.", 60), "Magnesium glycinate");
  });
});

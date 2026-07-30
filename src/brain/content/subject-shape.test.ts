import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifySubjectShape,
  dualSubjectFromLabel,
  isQuestionShapedSubject,
  toNounSubject,
} from "./subject-shape";
import { analyzeMalformedSubject } from "../evaluation/subjects/subject-rejection";

describe("subject-shape", () => {
  it("detects question-shaped subjects including Do/Does/Is", () => {
    assert.equal(
      isQuestionShapedSubject("Do you offer same-day emergency service?"),
      true
    );
    assert.equal(isQuestionShapedSubject("Does ZYNAVA sell supplements?"), true);
    assert.equal(isQuestionShapedSubject("Vitamin D"), false);
  });

  it("extracts noun subjects without discarding raw wording in dual fields", () => {
    const raw = "Do you offer same-day emergency service?";
    const dual = dualSubjectFromLabel(raw);
    assert.equal(dual.rawSubject, raw);
    assert.equal(dual.subjectShape, "question");
    assert.match(dual.normalizedSubject, /same-day emergency service/i);
    assert.ok(toNounSubject(raw));
    assert.equal(classifySubjectShape(raw), "question");
  });

  it("strips trailing/leading list separators from dual fields", () => {
    const dual = dualSubjectFromLabel(
      "Compare Supplement Prices Based on Your Preferences ·"
    );
    assert.equal(
      dual.rawSubject,
      "Compare Supplement Prices Based on Your Preferences"
    );
    assert.equal(
      dual.normalizedSubject,
      "Compare Supplement Prices Based on Your Preferences"
    );
    assert.equal(dual.normalizedSubject.includes("·"), false);
  });
});

describe("multi-item catalog guard", () => {
  it("rejects vitamin catalog list blobs", () => {
    const label =
      "Vitamins Vitamin D The Sunshine Vitamin C The Immune Vitamin B12";
    const a = analyzeMalformedSubject(label);
    assert.equal(a.malformed, true);
    assert.equal(a.reason, "multi_item_catalog");
    assert.ok((a.itemCount ?? 0) >= 2);
  });

  it("allows a single product name", () => {
    const a = analyzeMalformedSubject("Vitamin D3 Softgels");
    assert.equal(a.malformed, false);
  });

  it("does not reject normal marketing titles", () => {
    const a = analyzeMalformedSubject(
      "Compare Supplement Prices Based on Your Preferences"
    );
    assert.equal(a.malformed, false);
  });
});

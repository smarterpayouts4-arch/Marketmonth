import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deglueText } from "./deglue";

describe("deglueText", () => {
  it("separates an acronym brand from a following heading", () => {
    assert.equal(
      deglueText("About ZYNAVAWhy ZYNAVA ExistsThe supplement market", ["ZYNAVA"]),
      "About ZYNAVA Why ZYNAVA Exists The supplement market"
    );
  });

  it("restores a missing space after a sentence boundary", () => {
    assert.equal(
      deglueText("all in one place.We recognize that people need clarity."),
      "all in one place. We recognize that people need clarity."
    );
  });

  it("keeps a CamelCase business name intact", () => {
    assert.equal(
      deglueText("ClearFlow helps homeowners.", ["ClearFlow"]),
      "ClearFlow helps homeowners."
    );
    assert.equal(
      deglueText("ClearFlowOur Services", ["ClearFlow"]),
      "ClearFlow Our Services"
    );
  });

  it("keeps known platform and product capitalization", () => {
    assert.equal(
      deglueText("Follow us on LinkedIn and YouTube for TikTok clips."),
      "Follow us on LinkedIn and YouTube for TikTok clips."
    );
  });

  it("leaves urls untouched", () => {
    assert.equal(
      deglueText("Visit https://www.linkedin.com/company/Zynava today."),
      "Visit https://www.linkedin.com/company/Zynava today."
    );
  });

  it("is a no-op on already clean prose", () => {
    const clean =
      "We simplify supplement decisions with three free tools: explore options, build a plan, and ask questions.";
    assert.equal(deglueText(clean), clean);
  });
});

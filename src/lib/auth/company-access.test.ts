import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeCompanyDomain } from "./company-access";

describe("normalizeCompanyDomain (tenant matching)", () => {
  it("strips protocol, www, path, query, and case", () => {
    assert.equal(
      normalizeCompanyDomain("https://www.Zynava.com/shop?ref=x"),
      "zynava.com"
    );
    assert.equal(normalizeCompanyDomain("http://zynava.com/"), "zynava.com");
    assert.equal(normalizeCompanyDomain("  ZYNAVA.COM  "), "zynava.com");
  });

  it("keeps plain slugs (non-domain company folders) intact", () => {
    assert.equal(
      normalizeCompanyDomain("clearflow-plumbing"),
      "clearflow-plumbing"
    );
  });

  it("website and companyId forms of the same tenant compare equal", () => {
    assert.equal(
      normalizeCompanyDomain("https://www.zynava.com"),
      normalizeCompanyDomain("zynava.com")
    );
  });

  it("empty input normalizes to empty string", () => {
    assert.equal(normalizeCompanyDomain("   "), "");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadCompanyBrand } from "./load-company-brand";

describe("loadCompanyBrand", () => {
  it("loads approved brand profile from company artifact (no silent default)", () => {
    const fixture = loadCompanyBrand("zynava.com");
    assert.match(fixture.brandProfile.businessName, /zynava/i);
    assert.match(fixture.brandProfile.website, /zynava\.com/i);
    assert.equal(fixture.projection.companyId, "zynava.com");
  });
});

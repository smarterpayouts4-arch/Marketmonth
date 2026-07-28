import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  sealActiveBrandCookie,
  unsealActiveBrandCookie,
} from "./active-brand-cookie";

describe("active brand cookie", () => {
  const prev = process.env.AUTH_SECRET;

  afterEach(() => {
    if (prev === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = prev;
  });

  it("round-trips a signed payload", () => {
    process.env.AUTH_SECRET = "test-secret-for-cookie-signing";
    const sealed = sealActiveBrandCookie({
      brandId: "brand-1",
      companyName: "Zynava",
      website: "https://zynava.com",
      userName: "Oscar",
      hasProfile: true,
      hasStrategy: true,
    });
    assert.ok(sealed);
    const opened = unsealActiveBrandCookie(sealed);
    assert.equal(opened?.companyName, "Zynava");
    assert.equal(opened?.brandId, "brand-1");
  });

  it("rejects tampered signatures", () => {
    process.env.AUTH_SECRET = "test-secret-for-cookie-signing";
    const sealed = sealActiveBrandCookie({
      brandId: "brand-1",
      companyName: "Zynava",
      website: "https://zynava.com",
      userName: "Oscar",
      hasProfile: true,
      hasStrategy: false,
    });
    assert.ok(sealed);
    const [body] = sealed!.split(".");
    assert.equal(unsealActiveBrandCookie(`${body}.deadbeef`), null);
  });
});

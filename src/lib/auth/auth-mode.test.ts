import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isDevelopmentAuthBypassEnabled } from "./auth-mode";

describe("isDevelopmentAuthBypassEnabled", () => {
  it("is false in production even when DEV_AUTH_BYPASS=true", () => {
    assert.equal(
      isDevelopmentAuthBypassEnabled({
        NODE_ENV: "production",
        DEV_AUTH_BYPASS: "true",
      }),
      false
    );
  });

  it("is true in development when DEV_AUTH_BYPASS=true", () => {
    assert.equal(
      isDevelopmentAuthBypassEnabled({
        NODE_ENV: "development",
        DEV_AUTH_BYPASS: "true",
      }),
      true
    );
  });

  it("is true in development when unset (local default)", () => {
    assert.equal(
      isDevelopmentAuthBypassEnabled({
        NODE_ENV: "development",
      }),
      true
    );
  });

  it("honors legacy AUTH_BYPASS=true", () => {
    assert.equal(
      isDevelopmentAuthBypassEnabled({
        NODE_ENV: "development",
        AUTH_BYPASS: "true",
      }),
      true
    );
  });

  it("is false when DEV_AUTH_BYPASS=false (opt out)", () => {
    assert.equal(
      isDevelopmentAuthBypassEnabled({
        NODE_ENV: "development",
        DEV_AUTH_BYPASS: "false",
        AUTH_BYPASS: "true",
      }),
      false
    );
  });
});

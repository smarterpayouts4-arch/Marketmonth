import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getOrigin, normalizeWebsiteUrl } from "./normalize-url";

describe("normalizeWebsiteUrl", () => {
  it("accepts bare domains and forces https", () => {
    assert.equal(normalizeWebsiteUrl("example.com"), "https://example.com/");
  });

  it("strips query, hash, and trailing slash on paths", () => {
    assert.equal(
      normalizeWebsiteUrl("https://Example.com/path/?q=1#hash"),
      "https://example.com/path"
    );
  });

  it("rejects empty input (validation failure)", () => {
    assert.throws(() => normalizeWebsiteUrl("   "), /required/i);
  });

  it("rejects non-http protocols", () => {
    assert.throws(() => normalizeWebsiteUrl("ftp://example.com"), /http/i);
  });

  it("rejects invalid URLs", () => {
    assert.throws(() => normalizeWebsiteUrl("https://"), /valid/i);
  });

  it("getOrigin returns scheme+host", () => {
    assert.equal(getOrigin("https://www.example.com/a"), "https://www.example.com");
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canonicalizeUrl,
  classifyPath,
  MAX_CATALOG_PAGES,
  MAX_FETCH_ATTEMPTS,
  MAX_SUCCESSFUL_PAGES,
} from "./crawl-website";

describe("crawl-website bounds + classification", () => {
  it("exposes successful-page and attempt caps", () => {
    assert.equal(MAX_SUCCESSFUL_PAGES, 10);
    assert.ok(MAX_FETCH_ATTEMPTS >= 20 && MAX_FETCH_ATTEMPTS <= 30);
    assert.equal(MAX_CATALOG_PAGES, 3);
  });

  it("classifies how_it_works and catalog paths", () => {
    assert.equal(classifyPath("/how-it-works"), "how_it_works");
    assert.equal(classifyPath("/products/magnesium"), "products");
    assert.equal(classifyPath("/about"), "about");
    assert.equal(classifyPath("/"), "home");
  });

  it("canonicalizes same-origin URLs and strips tracking", () => {
    const origin = "https://example.com";
    const a = canonicalizeUrl(
      "https://example.com/shop?utm_source=x&id=1#frag",
      origin
    );
    assert.ok(a);
    assert.equal(a.includes("utm_source"), false);
    assert.equal(a.includes("#"), false);
    assert.ok(a.includes("id=1"));
  });

  it("rejects off-origin URLs", () => {
    assert.equal(
      canonicalizeUrl("https://evil.example/path", "https://example.com"),
      null
    );
  });
});

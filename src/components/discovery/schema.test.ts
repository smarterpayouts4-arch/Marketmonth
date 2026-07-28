import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { analyzeRequestSchema, errorEventSchema, stageEventSchema } from "./schema";

describe("discovery request / stream schemas", () => {
  it("accepts a non-empty analyze URL (success path)", () => {
    const parsed = analyzeRequestSchema.parse({ url: "https://example.com" });
    assert.equal(parsed.url, "https://example.com");
  });

  it("rejects empty URL (validation failure)", () => {
    const result = analyzeRequestSchema.safeParse({ url: "" });
    assert.equal(result.success, false);
  });

  it("accepts stage transition events used by the UI status machine", () => {
    const event = stageEventSchema.parse({
      type: "stage",
      id: "crawling",
      status: "active",
      label: "Crawling website",
    });
    assert.equal(event.status, "active");
  });

  it("accepts error stream events (failure path)", () => {
    const event = errorEventSchema.parse({
      type: "error",
      message: "Crawl failed",
    });
    assert.equal(event.message, "Crawl failed");
  });
});

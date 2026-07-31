import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { createDryRunAdapter } from "./adapters/dry-run-adapter";
import {
  genericRenderRequestSchema,
  normalizedRenderResultSchema,
} from "./contracts";
import { renderMedia } from "./render-media";

const validRequest = {
  requestId: "req_test_1",
  mediaKind: "image" as const,
  prompt: "A".repeat(3300),
  aspectRatio: "9:16",
  source: {
    channel: "youtube_short",
    formatId: "youtube_short",
    atomId: "atom_1",
    sceneId: "scene_1",
    revision: "abc123",
  },
  promptHash: "a".repeat(64),
  requestedAt: new Date().toISOString(),
};

describe("Phase 4A render contracts + dry-run adapter", () => {
  it("accepts valid provider-neutral image requests", () => {
    const parsed = genericRenderRequestSchema.parse(validRequest);
    assert.equal(parsed.mediaKind, "image");
    assert.equal(parsed.aspectRatio, "9:16");
    assert.equal(parsed.prompt.length, 3300);
  });

  it("enforces required fields and image mediaKind", () => {
    assert.throws(() =>
      genericRenderRequestSchema.parse({ ...validRequest, requestId: "" })
    );
    assert.throws(() =>
      genericRenderRequestSchema.parse({
        ...validRequest,
        mediaKind: "video",
      })
    );
  });

  it("contracts contain no provider-branded field identifiers", () => {
    const src = readFileSync(
      path.join(process.cwd(), "src/brain/render/contracts.ts"),
      "utf8"
    );
    assert.doesNotMatch(src, /\bgemini[A-Z_]|imagekit[A-Z_]|veoModel|elevenlabs/i);
    assert.doesNotMatch(src, /gemini_api|imagekit_|GOOGLE_AI/i);
  });

  it("dry-run adapter returns normalized success without assets", async () => {
    const result = await renderMedia(validRequest);
    assert.equal(result.status, "succeeded");
    assert.equal(result.mode, "dry_run");
    assert.equal(result.provider, "dry-run");
    assert.ok(result.rendererJobId.startsWith("dryrun_"));
    if (result.status === "succeeded") {
      assert.equal(result.assetRef, undefined);
      assert.equal(result.assetUrl, undefined);
    }
    normalizedRenderResultSchema.parse(result);
  });

  it("dry-run success schema rejects live asset URLs", () => {
    const bad = {
      requestId: "req_1",
      rendererJobId: "job_1",
      provider: "dry-run",
      mode: "dry_run" as const,
      status: "succeeded" as const,
      mediaKind: "image" as const,
      assetUrl: "https://example.com/fake.png",
      requestedAt: new Date().toISOString(),
    };
    const parsed = normalizedRenderResultSchema.safeParse(bad);
    assert.equal(parsed.success, false);
  });

  it("controlled failure returns normalized error", async () => {
    const adapter = createDryRunAdapter({
      failWith: {
        code: "test.fail",
        message: "forced failure",
        retryable: true,
      },
    });
    const result = await renderMedia(validRequest, { adapter });
    assert.equal(result.status, "failed");
    if (result.status === "failed") {
      assert.equal(result.error.code, "test.fail");
      assert.equal(result.error.retryable, true);
    }
  });

  it("renderer has no channel-store dependency", () => {
    const files = [
      "src/brain/render/render-media.ts",
      "src/brain/render/adapters/dry-run-adapter.ts",
      "src/brain/render/contracts.ts",
    ];
    for (const rel of files) {
      const src = readFileSync(path.join(process.cwd(), rel), "utf8");
      assert.doesNotMatch(src, /bundle-store|youtube-short|saveProductionBundle/);
      assert.doesNotMatch(src, /from ["']react["']/);
    }
  });
});

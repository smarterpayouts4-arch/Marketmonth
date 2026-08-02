import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runMediaPreflight } from "./media-preflight";

describe("runMediaPreflight", () => {
  it("rejects empty byte buffers", async () => {
    const result = await runMediaPreflight({
      source: { bytes: Buffer.alloc(0) },
      checkUrlReachable: false,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "media_preflight.empty_file");
    }
  });

  it("rejects non-media garbage bytes", async () => {
    const result = await runMediaPreflight({
      source: { bytes: Buffer.from("not-a-video-file") },
      checkUrlReachable: false,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(
        result.code === "media_preflight.no_video" ||
          result.code === "media_preflight.probe_failed" ||
          result.code === "media_preflight.invalid_duration" ||
          result.code === "media_preflight.ffmpeg_missing"
      );
    }
  });
});

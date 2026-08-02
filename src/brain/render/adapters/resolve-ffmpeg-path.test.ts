import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveFfmpegPath } from "./resolve-ffmpeg-path";

describe("resolveFfmpegPath", () => {
  it("resolves ffmpeg-static or env path without throwing", () => {
    const prev = process.env.MM_FFMPEG_PATH;
    delete process.env.MM_FFMPEG_PATH;
    try {
      const result = resolveFfmpegPath();
      if (result.ok) {
        assert.ok(result.path.length > 0);
        assert.ok(
          result.source === "ffmpeg-static" || result.source === "env"
        );
      } else {
        assert.match(result.error, /FFmpeg|ffmpeg-static|MM_FFMPEG_PATH/i);
      }
    } finally {
      if (prev === undefined) delete process.env.MM_FFMPEG_PATH;
      else process.env.MM_FFMPEG_PATH = prev;
    }
  });
});

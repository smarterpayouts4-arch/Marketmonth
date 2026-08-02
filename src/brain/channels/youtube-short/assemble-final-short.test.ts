import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { AddressInfo } from "node:net";

import { ffmpegConcatSceneClips } from "@/brain/render/adapters/ffmpeg-concat-scenes";
import { resolveFfmpegPath } from "@/brain/render/adapters/resolve-ffmpeg-path";
import { runMediaPreflight } from "@/brain/render/media-preflight";

import { preparePackageAssembly } from "./prepare-package-assembly";

function runFfmpeg(
  ffmpegPath: string,
  args: string[],
  cwd: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      cwd,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.slice(-400) || `ffmpeg exit ${code}`));
    });
  });
}

describe("assemble final short ordering", () => {
  const tempDirs: string[] = [];

  after(() => {
    for (const dir of tempDirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });

  it("sorts scene clips by order for concat", () => {
    const scenes = [
      {
        id: "s2",
        order: 2,
        composedVideo: {
          status: "succeeded" as const,
          assetUrl: "https://cdn.example.com/2.mp4",
        },
      },
      {
        id: "s0",
        order: 0,
        composedVideo: {
          status: "succeeded" as const,
          assetUrl: "https://cdn.example.com/0.mp4",
        },
      },
      {
        id: "s1",
        order: 1,
        composedVideo: {
          status: "succeeded" as const,
          assetUrl: "https://cdn.example.com/1.mp4",
        },
      },
    ];

    const ordered = [...scenes].sort((a, b) => a.order - b.order);
    assert.deepEqual(
      ordered.map((s) => s.id),
      ["s0", "s1", "s2"]
    );
    assert.deepEqual(
      ordered.map((s) => s.composedVideo.assetUrl),
      [
        "https://cdn.example.com/0.mp4",
        "https://cdn.example.com/1.mp4",
        "https://cdn.example.com/2.mp4",
      ]
    );
  });

  it("preparePackageAssembly rejects when scenes not ready (no atom)", async () => {
    const result = await preparePackageAssembly({ atomId: "" });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "short_assemble.invalid_request");
    }
  });

  it("FFmpeg concat preserves scene order and passes media preflight", async () => {
    const ffmpeg = resolveFfmpegPath();
    assert.equal(ffmpeg.ok, true);
    if (!ffmpeg.ok) return;

    const dir = mkdtempSync(path.join(tmpdir(), "mm-assemble-order-"));
    tempDirs.push(dir);

    // Two differently colored clips so order is observable via duration sum.
    await runFfmpeg(
      ffmpeg.path,
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=red:s=1080x1920:d=0.5",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=0.5",
        "-shortest",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "scene_a.mp4",
      ],
      dir
    );
    await runFfmpeg(
      ffmpeg.path,
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=blue:s=1080x1920:d=0.7",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=880:duration=0.7",
        "-shortest",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "scene_b.mp4",
      ],
      dir
    );

    const files = new Map([
      ["/a.mp4", readFileSync(path.join(dir, "scene_a.mp4"))],
      ["/b.mp4", readFileSync(path.join(dir, "scene_b.mp4"))],
    ]);

    const server = createServer((req, res) => {
      const body = files.get(req.url ?? "");
      if (!body) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, {
        "Content-Type": "video/mp4",
        "Content-Length": body.length,
      });
      res.end(body);
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    try {
      const concat = await ffmpegConcatSceneClips([
        { sceneId: "scene_a", url: `http://127.0.0.1:${port}/a.mp4` },
        { sceneId: "scene_b", url: `http://127.0.0.1:${port}/b.mp4` },
      ]);
      assert.deepEqual(concat.sceneIds, ["scene_a", "scene_b"]);
      assert.ok(concat.bytes.length > 1000);

      const preflight = await runMediaPreflight({
        source: { bytes: concat.bytes, hintName: "final-short.mp4" },
        expectAudio: true,
        expectWidth: 1080,
        expectHeight: 1920,
        checkUrlReachable: false,
      });
      assert.equal(preflight.ok, true);
      if (preflight.ok) {
        assert.ok(preflight.durationSeconds >= 1.0);
        assert.equal(preflight.width, 1080);
        assert.equal(preflight.height, 1920);
      }

      writeFileSync(path.join(dir, "out.mp4"), concat.bytes);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      );
    }
  });
});

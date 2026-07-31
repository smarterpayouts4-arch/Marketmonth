import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, it } from "node:test";

import { createLiveImageAdapter } from "./adapters/live-image-adapter";
import { buildImageKitObjectPath } from "./adapters/imagekit-upload";
import { readImageDimensions } from "./adapters/image-bytes";
import {
  resolveImageProviderConfig,
  toSafeConfigSummary,
} from "./config/image-provider-config";
import { renderMedia } from "./render-media";
import { createDryRunAdapter } from "./adapters/dry-run-adapter";

function tinyPortraitPng(): Buffer {
  // 1x2 PNG (portrait) minimal
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
}

const baseRequest = {
  requestId: "req_live_1",
  mediaKind: "image" as const,
  prompt: "P".repeat(3300),
  aspectRatio: "9:16",
  source: {
    channel: "youtube_short",
    formatId: "youtube_short",
    atomId: "atom_live",
    sceneId: "scene_1",
    revision: "rev1",
  },
  promptHash: "b".repeat(64),
  requestedAt: new Date().toISOString(),
};

const envKeys = [
  "MM_IMAGE_RENDER",
  "MM_IMAGE_API_KEY",
  "MM_IMAGE_PROVIDER",
  "MM_IMAGE_MODEL",
  "GEMINI_API_KEY",
  "GEMINI_IMAGE_MODEL",
  "IMAGEKIT_PUBLIC_KEY",
  "IMAGEKIT_PRIVATE_KEY",
  "IMAGEKIT_URL_ENDPOINT",
] as const;

const snapshot: Partial<Record<(typeof envKeys)[number], string | undefined>> =
  {};

function stashEnv() {
  for (const key of envKeys) snapshot[key] = process.env[key];
}

function restoreEnv() {
  for (const key of envKeys) {
    const value = snapshot[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("Phase 4B live image config + adapters", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("config aliases GEMINI_* and never serializes secrets", () => {
    stashEnv();
    process.env.MM_IMAGE_RENDER = "live";
    process.env.GEMINI_API_KEY = "secret-key-value";
    process.env.GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
    process.env.IMAGEKIT_PUBLIC_KEY = "pub";
    process.env.IMAGEKIT_PRIVATE_KEY = "priv";
    process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/demo";
    delete process.env.MM_IMAGE_API_KEY;
    delete process.env.MM_IMAGE_MODEL;

    const config = resolveImageProviderConfig();
    assert.equal(config.mode, "live");
    assert.equal(config.model, "gemini-2.5-flash-image");
    assert.equal(config.liveAvailable, true);
    const safe = JSON.stringify(toSafeConfigSummary(config));
    assert.doesNotMatch(safe, /secret-key-value/);
    assert.doesNotMatch(safe, /priv/);
  });

  it("missing ImageKit config reports safe missing names", () => {
    stashEnv();
    process.env.MM_IMAGE_RENDER = "live";
    process.env.GEMINI_API_KEY = "k";
    process.env.GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";
    delete process.env.IMAGEKIT_PUBLIC_KEY;
    delete process.env.IMAGEKIT_PRIVATE_KEY;
    delete process.env.IMAGEKIT_URL_ENDPOINT;
    const config = resolveImageProviderConfig();
    assert.ok(config.missing.includes("IMAGEKIT_PUBLIC_KEY"));
    assert.doesNotMatch(JSON.stringify(config), /GEMINI_API_KEY=k/);
  });

  it("default mode stays dry_run without MM_IMAGE_RENDER=live", () => {
    stashEnv();
    delete process.env.MM_IMAGE_RENDER;
    process.env.GEMINI_API_KEY = "k";
    process.env.GEMINI_IMAGE_MODEL = "m";
    process.env.IMAGEKIT_PUBLIC_KEY = "p";
    process.env.IMAGEKIT_PRIVATE_KEY = "s";
    process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/demo";
    assert.equal(resolveImageProviderConfig().mode, "dry_run");
  });

  it("live adapter generates via Gemini mock then uploads via ImageKit mock", async () => {
    const png = tinyPortraitPng();
    const adapter = createLiveImageAdapter({
      gemini: {
        config: {
          apiKey: "test",
          model: "gemini-2.5-flash-image",
          provider: "gemini",
        },
        generateContent: async ({ prompt, aspectRatio, model }) => {
          assert.equal(prompt.length, 3300);
          assert.equal(aspectRatio, "9:16");
          assert.equal(model, "gemini-2.5-flash-image");
          return {
            inlineData: {
              data: png.toString("base64"),
              mimeType: "image/png",
            },
          };
        },
      },
      imagekit: {
        config: {
          publicKey: "pub",
          privateKey: "priv",
          urlEndpoint: "https://ik.imagekit.io/demo",
        },
        upload: async ({ fileName, folder, bytes }) => {
          assert.ok(bytes.length > 0);
          assert.ok(folder.includes("marketmonth/atoms/atom_live"));
          assert.ok(fileName.endsWith(".png"));
          return {
            fileId: "file_123",
            url: "https://ik.imagekit.io/demo/marketmonth/scene.png",
            filePath: `${folder}/${fileName}`,
          };
        },
      },
    });

    const result = await adapter.render(baseRequest);
    assert.equal(result.status, "succeeded");
    assert.equal(result.mode, "live");
    assert.equal(result.provider, "gemini");
    if (result.status === "succeeded") {
      assert.equal(
        result.assetUrl,
        "https://ik.imagekit.io/demo/marketmonth/scene.png"
      );
      assert.equal(result.assetRef, "imagekit://file_123");
      assert.equal(result.providerMetadata?.mimeType, "image/png");
      assert.equal(result.providerMetadata?.storageProvider, "imagekit");
      assert.equal(result.providerMetadata?.bytes, png.length);
    }
    const serialized = JSON.stringify(result);
    assert.doesNotMatch(serialized, /iVBORw0KGgo/);
    assert.doesNotMatch(serialized, /priv|test/);
  });

  it("Gemini success + ImageKit failure returns failed with no assets", async () => {
    const png = tinyPortraitPng();
    const adapter = createLiveImageAdapter({
      gemini: {
        config: {
          apiKey: "test",
          model: "gemini-2.5-flash-image",
          provider: "gemini",
        },
        generateContent: async () => ({
          inlineData: { data: png.toString("base64"), mimeType: "image/png" },
        }),
      },
      imagekit: {
        config: {
          publicKey: "pub",
          privateKey: "priv",
          urlEndpoint: "https://ik.imagekit.io/demo",
        },
        upload: async () => {
          throw new Error("upload boom");
        },
      },
    });
    const result = await adapter.render(baseRequest);
    assert.equal(result.status, "failed");
    if (result.status === "failed") {
      assert.equal(result.error.code, "image_storage_upload_failed");
    }
    assert.equal("assetUrl" in result ? (result as { assetUrl?: string }).assetUrl : undefined, undefined);
  });

  it("dry-run adapter still works via renderMedia injection", async () => {
    const result = await renderMedia(baseRequest, {
      adapter: createDryRunAdapter(),
    });
    assert.equal(result.status, "succeeded");
    assert.equal(result.mode, "dry_run");
  });

  it("ImageKit path includes atom/scene/hash and unique request suffix", () => {
    const a = buildImageKitObjectPath(baseRequest);
    const b = buildImageKitObjectPath({
      ...baseRequest,
      requestId: "req_live_2_different",
    });
    assert.notEqual(a.fileName, b.fileName);
    assert.match(a.folder, /atom_live/);
    assert.match(a.folder, /scene_1/);
  });

  it("adapters do not import channel persistence", () => {
    for (const rel of [
      "src/brain/render/adapters/live-image-adapter.ts",
      "src/brain/render/adapters/gemini-image-generate.ts",
      "src/brain/render/adapters/imagekit-upload.ts",
      "src/brain/render/resolve-render-adapter.ts",
    ]) {
      const src = readFileSync(path.join(process.cwd(), rel), "utf8");
      assert.doesNotMatch(src, /bundle-store|saveProductionBundle/);
      assert.doesNotMatch(src, /from ["']@\/brain\/channels/);
      assert.doesNotMatch(src, /from ["']react["']/);
    }
  });

  it("reads portrait PNG dimensions", () => {
    const dims = readImageDimensions(tinyPortraitPng());
    assert.ok(dims);
    assert.equal(dims!.width, 1);
    assert.equal(dims!.height, 2);
  });
});

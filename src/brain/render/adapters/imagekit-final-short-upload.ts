import {
  ImageConfigError,
  requireImageKitConfig,
  type ImageKitConfigResolved,
} from "../config/image-provider-config";
import { ImageBytesError } from "./image-bytes";
import type { StoredVideoAsset } from "./imagekit-video-upload";

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

async function defaultUpload(input: {
  config: ImageKitConfigResolved;
  fileName: string;
  folder: string;
  bytes: Buffer;
  mimeType: string;
}): Promise<{ fileId: string; url: string }> {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(input.bytes)], {
    type: input.mimeType,
  });
  form.append("file", blob, input.fileName);
  form.append("fileName", input.fileName);
  form.append("folder", input.folder);
  form.append("useUniqueFileName", "true");

  const auth = Buffer.from(`${input.config.privateKey}:`).toString("base64");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}` },
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new ImageBytesError(
        "image_storage_upload_failed",
        `Final Short storage upload failed (${res.status})`,
        res.status === 429
      );
    }
    const data = (await res.json()) as { fileId?: string; url?: string };
    if (!data.fileId || !data.url) {
      throw new ImageBytesError(
        "image_storage_upload_failed",
        "Final Short storage returned incomplete upload result",
        true
      );
    }
    return { fileId: data.fileId, url: data.url };
  } catch (err) {
    if (err instanceof ImageBytesError || err instanceof ImageConfigError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new ImageBytesError(
        "image_storage_timeout",
        "Final Short storage upload timed out",
        true
      );
    }
    throw new ImageBytesError(
      "image_storage_upload_failed",
      "Final Short storage upload failed",
      true
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function uploadFinalShortToImageKit(input: {
  atomId: string;
  bytes: Buffer;
  mimeType: string;
}): Promise<StoredVideoAsset> {
  const config = requireImageKitConfig();
  const atomId = sanitizePathSegment(input.atomId);
  const folder = `marketmonth/atoms/${atomId}/youtube-short/final`;
  const fileName = `final-short-${Date.now()}.mp4`;
  const uploaded = await defaultUpload({
    config,
    fileName,
    folder,
    bytes: input.bytes,
    mimeType: input.mimeType || "video/mp4",
  });
  return {
    assetRef: `imagekit://${uploaded.fileId}`,
    assetUrl: uploaded.url,
    storageProvider: "imagekit",
    storageFileId: uploaded.fileId,
    mimeType: input.mimeType || "video/mp4",
    bytes: input.bytes.length,
  };
}

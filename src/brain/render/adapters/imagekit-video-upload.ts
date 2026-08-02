import {
  ImageConfigError,
  requireImageKitConfig,
  type ImageKitConfigResolved,
} from "../config/image-provider-config";
import { ImageBytesError } from "./image-bytes";

export type StoredVideoAsset = {
  assetRef: string;
  assetUrl: string;
  storageProvider: "imagekit";
  storageFileId: string;
  mimeType: string;
  bytes: number;
};

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
        `Video storage upload failed (${res.status})`,
        res.status === 429
      );
    }
    const data = (await res.json()) as { fileId?: string; url?: string };
    if (!data.fileId || !data.url) {
      throw new ImageBytesError(
        "image_storage_upload_failed",
        "Video storage returned incomplete upload result",
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
        "Video storage upload timed out",
        true
      );
    }
    throw new ImageBytesError(
      "image_storage_upload_failed",
      "Video storage upload failed",
      true
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Best-effort delete of a previously uploaded scene video file.
 * Failures are swallowed by callers — clear must still omit bundle video.
 */
export async function deleteSceneVideoFromImageKit(
  storageFileId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const fileId = storageFileId.trim();
  if (!fileId) {
    return { ok: false, error: "storageFileId is required" };
  }
  try {
    const config = requireImageKitConfig();
    const auth = Buffer.from(`${config.privateKey}:`).toString("base64");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(
        `https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Basic ${auth}` },
          signal: controller.signal,
        }
      );
      if (!res.ok && res.status !== 404) {
        return {
          ok: false,
          error: `ImageKit delete failed (${res.status})`,
        };
      }
      return { ok: true };
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 200) : "ImageKit delete failed";
    return { ok: false, error: message };
  }
}

/** Upload scene video bytes to ImageKit under the Short scene folder. */
export async function uploadSceneVideoToImageKit(input: {
  atomId: string;
  sceneId: string;
  bytes: Buffer;
  mimeType: string;
}): Promise<StoredVideoAsset> {
  const config = requireImageKitConfig();
  const atomId = sanitizePathSegment(input.atomId);
  const sceneId = sanitizePathSegment(input.sceneId);
  const folder = `marketmonth/atoms/${atomId}/youtube-short/scenes/${sceneId}/video`;
  const mime = input.mimeType.toLowerCase();
  const ext = mime.includes("webm") ? "webm" : "mp4";
  const fileName = `video-${Date.now()}.${ext}`;
  const uploaded = await defaultUpload({
    config,
    fileName,
    folder,
    bytes: input.bytes,
    mimeType: input.mimeType,
  });
  return {
    assetRef: `imagekit://${uploaded.fileId}`,
    assetUrl: uploaded.url,
    storageProvider: "imagekit",
    storageFileId: uploaded.fileId,
    mimeType: input.mimeType,
    bytes: input.bytes.length,
  };
}

import {
  ImageConfigError,
  requireImageKitConfig,
  type ImageKitConfigResolved,
} from "../config/image-provider-config";
import type { GenericRenderRequest } from "../contracts";
import { extensionForMime, ImageBytesError } from "./image-bytes";
import type { GeneratedImageMedia } from "./gemini-image-generate";

export type StoredImageAsset = {
  assetRef: string;
  assetUrl: string;
  storageProvider: "imagekit";
  storageFileId: string;
  filePath: string;
  mimeType: string;
  width?: number;
  height?: number;
  bytes: number;
  durationMs: number;
};

export type ImageKitUploadDeps = {
  config?: ImageKitConfigResolved;
  /** Test injection — bypasses network. */
  upload?: (input: {
    fileName: string;
    folder: string;
    bytes: Buffer;
    mimeType: string;
  }) => Promise<{
    fileId: string;
    url: string;
    filePath: string;
  }>;
};

function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

export function buildImageKitObjectPath(request: GenericRenderRequest): {
  folder: string;
  fileName: string;
} {
  const atomId = sanitizePathSegment(request.source.atomId);
  const sceneId = sanitizePathSegment(request.source.sceneId);
  const hashPrefix = request.promptHash.slice(0, 12);
  const jobSuffix = sanitizePathSegment(request.requestId).slice(-12);
  const folder = `marketmonth/atoms/${atomId}/youtube-short/scenes/${sceneId}`;
  const fileName = `${hashPrefix}-${jobSuffix}.png`;
  return { folder, fileName };
}

async function defaultUpload(input: {
  config: ImageKitConfigResolved;
  fileName: string;
  folder: string;
  bytes: Buffer;
  mimeType: string;
}): Promise<{ fileId: string; url: string; filePath: string }> {
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
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
      },
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) {
      const status = res.status;
      if (status === 401 || status === 403) {
        throw new ImageBytesError(
          "image_storage_upload_failed",
          "Image storage authentication failed",
          false
        );
      }
      if (status === 429) {
        throw new ImageBytesError(
          "image_storage_upload_failed",
          "Image storage rate limited",
          true
        );
      }
      throw new ImageBytesError(
        "image_storage_upload_failed",
        "Image storage upload failed",
        true
      );
    }
    const data = (await res.json()) as {
      fileId?: string;
      url?: string;
      filePath?: string;
    };
    if (!data.fileId || !data.url) {
      throw new ImageBytesError(
        "image_storage_upload_failed",
        "Image storage returned incomplete upload result",
        true
      );
    }
    return {
      fileId: data.fileId,
      url: data.url,
      filePath: data.filePath ?? `${input.folder}/${input.fileName}`,
    };
  } catch (err) {
    if (err instanceof ImageBytesError || err instanceof ImageConfigError) {
      throw err;
    }
    if (err instanceof Error && err.name === "AbortError") {
      throw new ImageBytesError(
        "image_storage_timeout",
        "Image storage upload timed out",
        true
      );
    }
    throw new ImageBytesError(
      "image_storage_upload_failed",
      "Image storage upload failed",
      true
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Upload generated media bytes to ImageKit. Channel-independent.
 */
export async function uploadGeneratedImageToImageKit(
  request: GenericRenderRequest,
  media: GeneratedImageMedia,
  deps: ImageKitUploadDeps = {}
): Promise<StoredImageAsset> {
  const started = Date.now();
  const config = deps.config ?? requireImageKitConfig();
  const { folder, fileName: baseName } = buildImageKitObjectPath(request);
  const fileName = baseName.replace(
    /\.png$/i,
    `.${extensionForMime(media.mimeType)}`
  );

  let uploaded: { fileId: string; url: string; filePath: string };
  try {
    uploaded = deps.upload
      ? await deps.upload({
          fileName,
          folder,
          bytes: media.bytes,
          mimeType: media.mimeType,
        })
      : await defaultUpload({
          config,
          fileName,
          folder,
          bytes: media.bytes,
          mimeType: media.mimeType,
        });
  } catch (err) {
    if (err instanceof ImageBytesError || err instanceof ImageConfigError) {
      throw err;
    }
    throw new ImageBytesError(
      "image_storage_upload_failed",
      "Image storage upload failed",
      true
    );
  }

  return {
    assetRef: `imagekit://${uploaded.fileId}`,
    assetUrl: uploaded.url,
    storageProvider: "imagekit",
    storageFileId: uploaded.fileId,
    filePath: uploaded.filePath,
    mimeType: media.mimeType,
    width: media.width,
    height: media.height,
    bytes: media.bytes.length,
    durationMs: Date.now() - started,
  };
}

/**
 * Pure helpers for generated image bytes (no provider SDKs).
 */

export type ImageDimensions = { width: number; height: number };

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;

export function assertImageByteBudget(bytes: Buffer): void {
  if (bytes.length === 0) {
    throw new ImageBytesError(
      "image_provider_empty_output",
      "Image provider returned empty image data",
      false
    );
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new ImageBytesError(
      "image_provider_invalid_output",
      "Image provider returned an oversized image payload",
      false
    );
  }
}

export function normalizeMimeType(raw: string | undefined): string {
  const mime = (raw ?? "").trim().toLowerCase();
  if (
    mime === "image/png" ||
    mime === "image/jpeg" ||
    mime === "image/jpg" ||
    mime === "image/webp"
  ) {
    return mime === "image/jpg" ? "image/jpeg" : mime;
  }
  throw new ImageBytesError(
    "unsupported_image_mime_type",
    "Unsupported generated image MIME type",
    false
  );
}

export function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      return "png";
  }
}

/** Read PNG/JPEG dimensions from buffer headers when possible. */
export function readImageDimensions(bytes: Buffer): ImageDimensions | null {
  if (bytes.length >= 24 && bytes.toString("ascii", 1, 4) === "PNG") {
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    if (width > 0 && height > 0) return { width, height };
  }
  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1]!;
      const size = bytes.readUInt16BE(offset + 2);
      if (marker === 0xc0 || marker === 0xc2) {
        const height = bytes.readUInt16BE(offset + 5);
        const width = bytes.readUInt16BE(offset + 7);
        if (width > 0 && height > 0) return { width, height };
        break;
      }
      offset += 2 + size;
    }
  }
  return null;
}

export function assertPortraitOrientation(dims: ImageDimensions | null): void {
  if (!dims) return;
  if (dims.width <= 0 || dims.height <= 0) {
    throw new ImageBytesError(
      "invalid_image_dimensions",
      "Generated image has invalid dimensions",
      false
    );
  }
  if (dims.width >= dims.height) {
    throw new ImageBytesError(
      "invalid_image_dimensions",
      "Generated image must be vertical (portrait 9:16)",
      false
    );
  }
}

export class ImageBytesError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable: boolean) {
    super(message);
    this.name = "ImageBytesError";
    this.code = code;
    this.retryable = retryable;
  }
}

export { MAX_IMAGE_BYTES };

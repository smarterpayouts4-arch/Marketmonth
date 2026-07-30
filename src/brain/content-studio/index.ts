/**
 * Client-safe Content Studio public surface.
 * Server-only modules (bundle-store, adapters) must be imported from their
 * deep paths — never re-exported here (node:fs / Turbopack).
 */

export {
  PLATFORM_REGISTRY,
  YOUTUBE_SHORT_FORMAT,
  YOUTUBE_VIDEO_FORMAT,
  defaultFormatIdsForYoutube,
  getFormat,
  getPlatform,
  listActiveFormatsForPlatform,
  type ContentFormatDefinition,
  type ContentFormatId,
  type PlatformDefinition,
  type PlatformId,
} from "./platform-registry";

export {
  contentFormatPackageSchema,
  contentProductionBundleSchema,
  youtubeShortFormatPackageSchema,
  youtubeVideoFormatPackageSchema,
  type ContentFormatPackage,
  type ContentProductionBundle,
  type PackageStatus,
  type YouTubeShortFormatPackage,
  type YouTubeVideoFormatPackage,
} from "./schemas/format-package";

export type {
  ContentFormatAdapter,
  FormatProductionInput,
  FormatValidationResult,
} from "./adapters/types";

export type ContentStudioSource =
  | { type: "atom"; atomId: string }
  | { type: "legacy_handoff"; handoff: unknown }
  | { type: "empty" };

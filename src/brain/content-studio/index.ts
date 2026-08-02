/**
 * Client-safe Content Studio public surface (transitional multi-format layer — ADR 0006).
 * Server-only modules (bundle-store, adapters) must be imported from their
 * deep paths — never re-exported here (node:fs / Turbopack).
 *
 * Studio UI may import this barrel for registry + format types only.
 * Do not re-export channels, render, or use-cases here.
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

/** Re-export Short duration policy for client-safe Studio copy (canonical file remains under channels/youtube-short). */
export {
  YOUTUBE_SHORT_DURATION_DEFAULT_SECONDS,
  YOUTUBE_SHORT_DURATION_MAX_SECONDS,
} from "@/brain/channels/youtube-short/duration-policy";

/** Scene-count bounds for Manual scaffolding (canonical: youtube-short-draft). */
export {
  YOUTUBE_SHORT_SCENE_COUNT_MAX,
  YOUTUBE_SHORT_SCENE_COUNT_MIN,
} from "@/brain/channels/youtube-short/youtube-short-draft";

/** Short scene field-size policy (canonical: scene-field-limits). */
export {
  SCENE_MOTION_PROMPT_MAX_CHARS,
  SCENE_NARRATION_MAX_CHARS,
  SCENE_ON_SCREEN_TEXT_MAX_CHARS,
  SCENE_PASTE_PROMPT_MAX_CHARS,
  SCENE_VISUAL_PROMPT_MAX_CHARS,
  SHORT_PACKAGE_IMAGE_PROMPT_MAX_CHARS,
  VIDEO_CHAPTER_VISUAL_PROMPT_MAX_CHARS,
} from "@/brain/channels/youtube-short/scene-field-limits";

/** Shared onScreenText → title/support/disclaimer layout (DOM + compose). */
export {
  buildOnScreenTextLayout,
  splitOnScreenTextBlocks,
  type OnScreenTextLayout,
} from "./on-screen-text-layout";

/** Pure Veo prompt composer (soft-compare + prepare-scene-video). */
export { composeEffectiveVeoPrompt } from "./compose-effective-veo-prompt";

/** Soft-compare planner for Generate Complete Scene orchestration. */
export {
  planSceneFullGenerate,
  type SceneFullGenerateEdits,
  type SceneFullGeneratePlan,
  type SceneFullGenerateStep,
} from "./plan-scene-full-generate";

/** AssetType-aware scene / package readiness for manual Short assembly. */
export {
  computePackageAssemblyReadiness,
  computeSceneReadiness,
  type PackageAssemblyReadiness,
  type ReadinessStatus,
  type SceneAssetReadiness,
} from "./compute-scene-readiness";

export {
  contentFormatPackageSchema,
  contentProductionBundleSchema,
  youtubeShortFormatPackageSchema,
  youtubeVideoFormatPackageSchema,
  type ContentFormatPackage,
  type ContentProductionBundle,
  type PackageStatus,
  type SceneCard,
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

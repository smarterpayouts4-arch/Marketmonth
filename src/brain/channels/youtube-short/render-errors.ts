/**
 * Stable domain error codes for Short scene image render (Phase 4A).
 */

export const SHORT_RENDER_ERROR_CODES = {
  UNAUTHENTICATED: "short_render.unauthenticated",
  INVALID_REQUEST: "short_render.invalid_request",
  ATOM_NOT_FOUND: "short_render.atom_not_found",
  FORMAT_NOT_FOUND: "short_render.format_not_found",
  SCENE_NOT_FOUND: "short_render.scene_not_found",
  SCENE_NOT_SAVED: "short_render.scene_not_saved",
  EMPTY_VISUAL_PROMPT: "short_render.empty_visual_prompt",
  UNSUPPORTED_ASSET_TYPE: "short_render.unsupported_asset_type",
  RENDERER_UNAVAILABLE: "short_render.renderer_unavailable",
  RENDERER_REJECTED_INPUT: "short_render.renderer_rejected_input",
  RENDERER_FAILED: "short_render.renderer_failed",
  STALE_SCENE_REVISION: "short_render.stale_scene_revision",
  BUNDLE_PERSISTENCE_FAILED: "short_render.bundle_persistence_failed",
  ATOM_NOT_LOCKED: "short_render.atom_not_locked",
} as const;

export type ShortRenderErrorCode =
  (typeof SHORT_RENDER_ERROR_CODES)[keyof typeof SHORT_RENDER_ERROR_CODES];

export const SHORT_RENDER_ERROR_MESSAGES: Record<ShortRenderErrorCode, string> =
  {
    [SHORT_RENDER_ERROR_CODES.UNAUTHENTICATED]: "Authentication required",
    [SHORT_RENDER_ERROR_CODES.INVALID_REQUEST]: "Invalid render request",
    [SHORT_RENDER_ERROR_CODES.ATOM_NOT_FOUND]: "Atom not found",
    [SHORT_RENDER_ERROR_CODES.FORMAT_NOT_FOUND]:
      "Bundle has no youtube_short package",
    [SHORT_RENDER_ERROR_CODES.SCENE_NOT_FOUND]: "Scene not found",
    [SHORT_RENDER_ERROR_CODES.SCENE_NOT_SAVED]:
      "Save this scene before preparing its render.",
    [SHORT_RENDER_ERROR_CODES.EMPTY_VISUAL_PROMPT]:
      "Scene visual prompt is empty",
    [SHORT_RENDER_ERROR_CODES.UNSUPPORTED_ASSET_TYPE]:
      "Only image asset scenes can be prepared in this phase",
    [SHORT_RENDER_ERROR_CODES.RENDERER_UNAVAILABLE]: "Renderer unavailable",
    [SHORT_RENDER_ERROR_CODES.RENDERER_REJECTED_INPUT]:
      "Renderer rejected the render input",
    [SHORT_RENDER_ERROR_CODES.RENDERER_FAILED]: "Renderer failed",
    [SHORT_RENDER_ERROR_CODES.STALE_SCENE_REVISION]:
      "Scene changed during render — result discarded",
    [SHORT_RENDER_ERROR_CODES.BUNDLE_PERSISTENCE_FAILED]:
      "Could not persist render state",
    [SHORT_RENDER_ERROR_CODES.ATOM_NOT_LOCKED]:
      "Atom must be locked before rendering",
  };

export function httpStatusForShortRenderError(code: ShortRenderErrorCode): number {
  switch (code) {
    case SHORT_RENDER_ERROR_CODES.UNAUTHENTICATED:
      return 401;
    case SHORT_RENDER_ERROR_CODES.INVALID_REQUEST:
    case SHORT_RENDER_ERROR_CODES.EMPTY_VISUAL_PROMPT:
    case SHORT_RENDER_ERROR_CODES.UNSUPPORTED_ASSET_TYPE:
    case SHORT_RENDER_ERROR_CODES.SCENE_NOT_SAVED:
    case SHORT_RENDER_ERROR_CODES.ATOM_NOT_LOCKED:
    case SHORT_RENDER_ERROR_CODES.RENDERER_REJECTED_INPUT:
      return 422;
    case SHORT_RENDER_ERROR_CODES.ATOM_NOT_FOUND:
    case SHORT_RENDER_ERROR_CODES.FORMAT_NOT_FOUND:
    case SHORT_RENDER_ERROR_CODES.SCENE_NOT_FOUND:
      return 404;
    case SHORT_RENDER_ERROR_CODES.STALE_SCENE_REVISION:
      return 409;
    case SHORT_RENDER_ERROR_CODES.RENDERER_UNAVAILABLE:
    case SHORT_RENDER_ERROR_CODES.RENDERER_FAILED:
    case SHORT_RENDER_ERROR_CODES.BUNDLE_PERSISTENCE_FAILED:
      return 503;
    default:
      return 500;
  }
}

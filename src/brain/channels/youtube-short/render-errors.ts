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
  ALREADY_RUNNING: "short_render.already_running",
  BUNDLE_PERSISTENCE_FAILED: "short_render.bundle_persistence_failed",
  ATOM_NOT_LOCKED: "short_render.atom_not_locked",
  IMAGE_PROVIDER_NOT_CONFIGURED: "image_provider_not_configured",
  IMAGE_MODEL_NOT_CONFIGURED: "image_model_not_configured",
  STORAGE_NOT_CONFIGURED: "storage_not_configured",
  IMAGE_PROVIDER_AUTH_FAILED: "image_provider_auth_failed",
  IMAGE_PROVIDER_RATE_LIMITED: "image_provider_rate_limited",
  IMAGE_PROVIDER_TIMEOUT: "image_provider_timeout",
  IMAGE_PROVIDER_REJECTED_PROMPT: "image_provider_rejected_prompt",
  IMAGE_PROVIDER_EMPTY_OUTPUT: "image_provider_empty_output",
  IMAGE_PROVIDER_INVALID_OUTPUT: "image_provider_invalid_output",
  UNSUPPORTED_IMAGE_MIME_TYPE: "unsupported_image_mime_type",
  INVALID_IMAGE_DIMENSIONS: "invalid_image_dimensions",
  IMAGE_STORAGE_UPLOAD_FAILED: "image_storage_upload_failed",
  IMAGE_STORAGE_TIMEOUT: "image_storage_timeout",
  UNKNOWN_IMAGE_GENERATION_FAILURE: "unknown_image_generation_failure",
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
      "Unsupported asset type for still image generation",
    [SHORT_RENDER_ERROR_CODES.RENDERER_UNAVAILABLE]: "Renderer unavailable",
    [SHORT_RENDER_ERROR_CODES.RENDERER_REJECTED_INPUT]:
      "Renderer rejected the render input",
    [SHORT_RENDER_ERROR_CODES.RENDERER_FAILED]: "Renderer failed",
    [SHORT_RENDER_ERROR_CODES.STALE_SCENE_REVISION]:
      "Scene changed during render — result discarded",
    [SHORT_RENDER_ERROR_CODES.ALREADY_RUNNING]:
      "Image generation is already running.",
    [SHORT_RENDER_ERROR_CODES.BUNDLE_PERSISTENCE_FAILED]:
      "Could not persist render state",
    [SHORT_RENDER_ERROR_CODES.ATOM_NOT_LOCKED]:
      "Atom must be locked before rendering",
    [SHORT_RENDER_ERROR_CODES.IMAGE_PROVIDER_NOT_CONFIGURED]:
      "Image provider is not configured",
    [SHORT_RENDER_ERROR_CODES.IMAGE_MODEL_NOT_CONFIGURED]:
      "Image model is not configured",
    [SHORT_RENDER_ERROR_CODES.STORAGE_NOT_CONFIGURED]:
      "Image storage is not configured",
    [SHORT_RENDER_ERROR_CODES.IMAGE_PROVIDER_AUTH_FAILED]:
      "Image provider authentication failed",
    [SHORT_RENDER_ERROR_CODES.IMAGE_PROVIDER_RATE_LIMITED]:
      "Image provider rate limited — try again shortly",
    [SHORT_RENDER_ERROR_CODES.IMAGE_PROVIDER_TIMEOUT]:
      "Image provider timed out",
    [SHORT_RENDER_ERROR_CODES.IMAGE_PROVIDER_REJECTED_PROMPT]:
      "Image provider rejected the prompt",
    [SHORT_RENDER_ERROR_CODES.IMAGE_PROVIDER_EMPTY_OUTPUT]:
      "Image provider returned no image",
    [SHORT_RENDER_ERROR_CODES.IMAGE_PROVIDER_INVALID_OUTPUT]:
      "Image provider returned invalid image data",
    [SHORT_RENDER_ERROR_CODES.UNSUPPORTED_IMAGE_MIME_TYPE]:
      "Unsupported generated image type",
    [SHORT_RENDER_ERROR_CODES.INVALID_IMAGE_DIMENSIONS]:
      "Generated image was not a valid vertical still",
    [SHORT_RENDER_ERROR_CODES.IMAGE_STORAGE_UPLOAD_FAILED]:
      "Could not store the generated image",
    [SHORT_RENDER_ERROR_CODES.IMAGE_STORAGE_TIMEOUT]:
      "Image storage timed out",
    [SHORT_RENDER_ERROR_CODES.UNKNOWN_IMAGE_GENERATION_FAILURE]:
      "Image generation failed",
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
    case SHORT_RENDER_ERROR_CODES.IMAGE_PROVIDER_REJECTED_PROMPT:
    case SHORT_RENDER_ERROR_CODES.UNSUPPORTED_IMAGE_MIME_TYPE:
    case SHORT_RENDER_ERROR_CODES.INVALID_IMAGE_DIMENSIONS:
    case SHORT_RENDER_ERROR_CODES.IMAGE_PROVIDER_NOT_CONFIGURED:
    case SHORT_RENDER_ERROR_CODES.IMAGE_MODEL_NOT_CONFIGURED:
    case SHORT_RENDER_ERROR_CODES.STORAGE_NOT_CONFIGURED:
      return 422;
    case SHORT_RENDER_ERROR_CODES.ATOM_NOT_FOUND:
    case SHORT_RENDER_ERROR_CODES.FORMAT_NOT_FOUND:
    case SHORT_RENDER_ERROR_CODES.SCENE_NOT_FOUND:
      return 404;
    case SHORT_RENDER_ERROR_CODES.STALE_SCENE_REVISION:
    case SHORT_RENDER_ERROR_CODES.ALREADY_RUNNING:
      return 409;
    case SHORT_RENDER_ERROR_CODES.IMAGE_PROVIDER_AUTH_FAILED:
      return 401;
    case SHORT_RENDER_ERROR_CODES.IMAGE_PROVIDER_RATE_LIMITED:
      return 429;
    case SHORT_RENDER_ERROR_CODES.RENDERER_UNAVAILABLE:
    case SHORT_RENDER_ERROR_CODES.RENDERER_FAILED:
    case SHORT_RENDER_ERROR_CODES.BUNDLE_PERSISTENCE_FAILED:
    case SHORT_RENDER_ERROR_CODES.IMAGE_PROVIDER_TIMEOUT:
    case SHORT_RENDER_ERROR_CODES.IMAGE_PROVIDER_EMPTY_OUTPUT:
    case SHORT_RENDER_ERROR_CODES.IMAGE_PROVIDER_INVALID_OUTPUT:
    case SHORT_RENDER_ERROR_CODES.IMAGE_STORAGE_UPLOAD_FAILED:
    case SHORT_RENDER_ERROR_CODES.IMAGE_STORAGE_TIMEOUT:
    case SHORT_RENDER_ERROR_CODES.UNKNOWN_IMAGE_GENERATION_FAILURE:
      return 503;
    default:
      return 500;
  }
}

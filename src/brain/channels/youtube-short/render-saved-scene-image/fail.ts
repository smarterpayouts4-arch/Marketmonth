import type { ContentProductionBundle } from "@/brain/content-studio/schemas/format-package";

import {
  httpStatusForShortRenderError,
  SHORT_RENDER_ERROR_MESSAGES,
  type ShortRenderErrorCode,
} from "../render-errors";
import type { SceneRenderState } from "../scene-render-state";

import type { RenderSavedSceneImageResult } from "./types";

export function fail(
  code: ShortRenderErrorCode,
  extras?: {
    bundle?: ContentProductionBundle;
    render?: SceneRenderState;
    message?: string;
  }
): RenderSavedSceneImageResult {
  return {
    ok: false,
    code,
    error: extras?.message ?? SHORT_RENDER_ERROR_MESSAGES[code],
    status: httpStatusForShortRenderError(code),
    bundle: extras?.bundle,
    render: extras?.render,
  };
}

import { renderMedia } from "@/brain/render";
import type { NormalizedRenderResult } from "@/brain/render";

import { SHORT_RENDER_ERROR_CODES } from "../render-errors";
import type { SceneRenderState } from "../scene-render-state";
import { shortRenderInputToGenericRequest } from "../short-render-input";

import {
  renderStepLockKey,
  withRenderStepLock,
} from "../render-step-lock";

import { applyStaleOrFinal } from "./apply-stale-or-final";
import { fail } from "./fail";
import {
  persistShortPackage,
  priorAssetFields,
  withSceneRender,
} from "./persist-scene-render";
import { prepareSceneRender } from "./prepare-scene-render";
import {
  expectedProvider,
  expectedRenderMode,
} from "./resolve-render-mode";
import type {
  RenderSavedSceneImageInput,
  RenderSavedSceneImageResult,
} from "./types";

/**
 * Render one durable saved Short scene image via the shared renderer.
 * Loads saved scene from the production bundle — never trusts client prompts.
 */
export async function renderYouTubeShortSavedSceneImage(
  input: RenderSavedSceneImageInput
): Promise<RenderSavedSceneImageResult> {
  return withRenderStepLock(
    renderStepLockKey("image", input.atomId, input.sceneId),
    () => renderYouTubeShortSavedSceneImageLocked(input)
  );
}

async function renderYouTubeShortSavedSceneImageLocked(
  input: RenderSavedSceneImageInput
): Promise<RenderSavedSceneImageResult> {
  const preparedOutcome = await prepareSceneRender(input);
  if (!preparedOutcome.ok) return preparedOutcome.result;

  const { prepared } = preparedOutcome;
  let { bundle, shortPkg } = prepared;
  const {
    sceneId,
    sourceRevision,
    promptHash,
    visualPromptUsed,
    assetTypeUsed,
    requestId,
    requestedAt,
    attempt,
    priorRender,
    shortRenderInput,
  } = prepared;

  const mode = expectedRenderMode(input.adapter);
  const provider = expectedProvider(input.adapter);

  const queued: SceneRenderState = {
    ...priorAssetFields(priorRender),
    status: "queued",
    requestId,
    mode,
    provider,
    mediaKind: "image",
    promptHash,
    sourceRevision,
    visualPromptUsed,
    assetTypeUsed,
    attempt,
    requestedAt,
    updatedAt: requestedAt,
    error: undefined,
  };

  shortPkg = withSceneRender(shortPkg, sceneId, queued);
  try {
    bundle = await persistShortPackage(bundle, shortPkg);
  } catch {
    return fail(SHORT_RENDER_ERROR_CODES.BUNDLE_PERSISTENCE_FAILED, { bundle });
  }

  const running: SceneRenderState = {
    ...queued,
    status: "running",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  shortPkg = withSceneRender(shortPkg, sceneId, running);
  try {
    bundle = await persistShortPackage(bundle, shortPkg);
  } catch {
    return fail(SHORT_RENDER_ERROR_CODES.BUNDLE_PERSISTENCE_FAILED, {
      bundle,
      render: queued,
    });
  }

  let rendererResult: NormalizedRenderResult;
  try {
    rendererResult = await renderMedia(
      shortRenderInputToGenericRequest(shortRenderInput),
      { adapter: input.adapter }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 400) : "Renderer unavailable";
    const failed: SceneRenderState = {
      ...priorAssetFields(priorRender),
      status: "failed",
      requestId,
      mode,
      provider,
      mediaKind: "image",
      promptHash,
      sourceRevision,
      visualPromptUsed,
      assetTypeUsed,
      attempt,
      requestedAt,
      startedAt: running.startedAt,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: {
        code: SHORT_RENDER_ERROR_CODES.RENDERER_UNAVAILABLE,
        message,
        retryable: true,
      },
    };
    shortPkg = withSceneRender(shortPkg, sceneId, failed);
    try {
      bundle = await persistShortPackage(bundle, shortPkg);
    } catch {
      /* best-effort */
    }
    return fail(SHORT_RENDER_ERROR_CODES.RENDERER_UNAVAILABLE, {
      bundle,
      render: failed,
      message,
    });
  }

  return applyStaleOrFinal({
    prepared,
    bundle,
    shortPkg,
    running,
    rendererResult,
  });
}

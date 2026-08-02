import type { NormalizedRenderResult } from "@/brain/render";

import type { SceneRenderState } from "./scene-render-state";
import { SHORT_RENDER_ERROR_CODES } from "./render-errors";

function priorAssets(prior: SceneRenderState | undefined) {
  if (!prior?.assetUrl && !prior?.assetRef) return {};
  return {
    assetRef: prior.assetRef,
    assetUrl: prior.assetUrl,
    mimeType: prior.mimeType,
    width: prior.width,
    height: prior.height,
    storageProvider: prior.storageProvider,
    storageFileId: prior.storageFileId,
  };
}

function metaString(
  meta: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const value = meta?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function metaNumber(
  meta: Record<string, unknown> | undefined,
  key: string
): number | undefined {
  const value = meta?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Map shared renderer result → durable scene.render, preserving prior assets
 * on failed regeneration attempts.
 */
export function mapRendererResultToSceneRender(input: {
  result: NormalizedRenderResult;
  prior: SceneRenderState | undefined;
  promptHash: string;
  sourceRevision: string;
  visualPromptUsed: string;
  assetTypeUsed: "image" | "video";
  attempt: number;
  requestId: string;
  requestedAt: string;
  startedAt?: string;
}): SceneRenderState {
  const {
    result,
    prior,
    promptHash,
    sourceRevision,
    visualPromptUsed,
    assetTypeUsed,
    attempt,
    requestId,
    requestedAt,
    startedAt,
  } = input;
  const now = new Date().toISOString();
  const preserved = priorAssets(prior);

  if (result.status === "failed") {
    return {
      ...preserved,
      status: "failed",
      requestId,
      jobId: result.rendererJobId,
      mode: result.mode,
      provider: result.provider,
      mediaKind: "image",
      promptHash,
      sourceRevision,
      visualPromptUsed,
      assetTypeUsed,
      attempt,
      error: result.error,
      requestedAt,
      startedAt: result.startedAt ?? startedAt,
      completedAt: result.completedAt ?? now,
      updatedAt: now,
    };
  }

  if (result.status !== "succeeded") {
    return {
      ...preserved,
      status: "failed",
      requestId,
      jobId: result.rendererJobId,
      mode: result.mode,
      provider: result.provider,
      mediaKind: "image",
      promptHash,
      sourceRevision,
      visualPromptUsed,
      assetTypeUsed,
      attempt,
      error: {
        code: SHORT_RENDER_ERROR_CODES.RENDERER_FAILED,
        message: `Unexpected renderer status: ${result.status}`,
        retryable: true,
      },
      requestedAt,
      startedAt: result.startedAt ?? startedAt,
      completedAt: now,
      updatedAt: now,
    };
  }

  if (result.mode === "dry_run") {
    if (result.assetRef || result.assetUrl) {
      return {
        ...preserved,
        status: "failed",
        requestId,
        jobId: result.rendererJobId,
        mode: "dry_run",
        provider: result.provider,
        mediaKind: "image",
        promptHash,
        sourceRevision,
        visualPromptUsed,
        assetTypeUsed,
        attempt,
        error: {
          code: SHORT_RENDER_ERROR_CODES.RENDERER_REJECTED_INPUT,
          message: "Dry-run result must not include media assets",
          retryable: false,
        },
        requestedAt,
        startedAt: result.startedAt ?? startedAt,
        completedAt: now,
        updatedAt: now,
      };
    }
    return {
      ...preserved,
      status: "dry_run_succeeded",
      requestId,
      jobId: result.rendererJobId,
      mode: "dry_run",
      provider: result.provider,
      mediaKind: "image",
      promptHash,
      sourceRevision,
      visualPromptUsed,
      assetTypeUsed,
      attempt,
      error: undefined,
      requestedAt,
      startedAt: result.startedAt ?? startedAt,
      completedAt: result.completedAt ?? now,
      updatedAt: now,
    };
  }

  if (!result.assetUrl || !result.assetRef) {
    return {
      ...preserved,
      status: "failed",
      requestId,
      jobId: result.rendererJobId,
      mode: "live",
      provider: result.provider,
      mediaKind: "image",
      promptHash,
      sourceRevision,
      visualPromptUsed,
      assetTypeUsed,
      attempt,
      error: {
        code: SHORT_RENDER_ERROR_CODES.RENDERER_REJECTED_INPUT,
        message: "Live render succeeded without durable asset fields",
        retryable: true,
      },
      requestedAt,
      startedAt: result.startedAt ?? startedAt,
      completedAt: now,
      updatedAt: now,
    };
  }

  const meta = result.providerMetadata;
  return {
    status: "succeeded",
    requestId,
    jobId: result.rendererJobId,
    mode: "live",
    provider: result.provider,
    mediaKind: "image",
    promptHash,
    sourceRevision,
    visualPromptUsed,
    assetTypeUsed,
    attempt,
    assetRef: result.assetRef,
    assetUrl: result.assetUrl,
    mimeType: metaString(meta, "mimeType"),
    width: metaNumber(meta, "width"),
    height: metaNumber(meta, "height"),
    storageProvider: metaString(meta, "storageProvider"),
    storageFileId: metaString(meta, "storageFileId"),
    error: undefined,
    requestedAt,
    startedAt: result.startedAt ?? startedAt,
    completedAt: result.completedAt ?? now,
    updatedAt: now,
  };
}

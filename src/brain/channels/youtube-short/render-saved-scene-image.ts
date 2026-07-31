import { randomUUID } from "node:crypto";

import type { ContentAtom } from "@/brain/atom";
import type { AtomValidationReport } from "@/brain/atom/validate/types";
import {
  loadLatestProductionBundle,
  loadProductionBundle,
  saveProductionBundle,
} from "@/brain/content-studio/bundle-store";
import type {
  ContentProductionBundle,
  SceneCard,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio/schemas/format-package";
import {
  renderMedia,
  type NormalizedRenderResult,
  type RenderMediaAdapter,
} from "@/brain/render";
import { createAtomRepository } from "@/brain/store";

import {
  composeShortSceneEffectiveImagePrompt,
  hashEffectiveImagePrompt,
  hashSceneRenderSource,
} from "./compose-effective-image-prompt";
import {
  httpStatusForShortRenderError,
  SHORT_RENDER_ERROR_CODES,
  SHORT_RENDER_ERROR_MESSAGES,
  type ShortRenderErrorCode,
} from "./render-errors";
import type { SceneRenderState } from "./scene-render-state";
import {
  shortRenderInputSchema,
  shortRenderInputToGenericRequest,
  type ShortRenderInput,
} from "./short-render-input";
import { formatPackageToYouTubeShortDraft } from "./to-youtube-short-draft";
import type { YouTubeShortDraft } from "./youtube-short-draft";

export type RenderSavedSceneImageInput = {
  atomId: string;
  formatId?: "youtube_short";
  sceneId: string;
  companyIdHint?: string;
  /** Test injection — default dry-run adapter via renderMedia. */
  adapter?: RenderMediaAdapter;
};

export type RenderSavedSceneImageResult =
  | {
      ok: true;
      bundle: ContentProductionBundle;
      package: YouTubeShortFormatPackage;
      draft: YouTubeShortDraft;
      atom: ContentAtom;
      validationReport: AtomValidationReport | null;
      recordRevision: number;
      sceneId: string;
      render: SceneRenderState;
      shortRenderInput: ShortRenderInput;
      rendererResult: NormalizedRenderResult;
    }
  | {
      ok: false;
      error: string;
      code: ShortRenderErrorCode;
      status: number;
      bundle?: ContentProductionBundle;
      render?: SceneRenderState;
    };

function fail(
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

function withSceneRender(
  pkg: YouTubeShortFormatPackage,
  sceneId: string,
  render: SceneRenderState
): YouTubeShortFormatPackage {
  return {
    ...pkg,
    scenes: pkg.scenes.map((scene) =>
      scene.id === sceneId ? { ...scene, render } : scene
    ),
  };
}

async function persistShortPackage(
  bundle: ContentProductionBundle,
  shortPkg: YouTubeShortFormatPackage
): Promise<ContentProductionBundle> {
  const next: ContentProductionBundle = {
    ...bundle,
    packages: bundle.packages.map((p) =>
      p.formatId === "youtube_short" ? shortPkg : p
    ),
    updatedAt: new Date().toISOString(),
  };
  await saveProductionBundle(next);
  return next;
}

function mapRendererFailure(
  result: Extract<NormalizedRenderResult, { status: "failed" }>
): SceneRenderState {
  const now = new Date().toISOString();
  return {
    status: "failed",
    requestId: result.requestId,
    jobId: result.rendererJobId,
    mode: result.mode,
    provider: result.provider,
    mediaKind: "image",
    error: result.error,
    requestedAt: result.requestedAt,
    startedAt: result.startedAt,
    completedAt: result.completedAt ?? now,
    updatedAt: now,
  };
}

/**
 * Render one durable saved Short scene image via the shared dry-run renderer.
 * Loads saved scene from the production bundle — never trusts client prompts.
 */
export async function renderYouTubeShortSavedSceneImage(
  input: RenderSavedSceneImageInput
): Promise<RenderSavedSceneImageResult> {
  const atomId = input.atomId.trim();
  const sceneId = input.sceneId.trim();

  if (!atomId || !sceneId) {
    return fail(SHORT_RENDER_ERROR_CODES.INVALID_REQUEST);
  }
  if (input.formatId != null && input.formatId !== "youtube_short") {
    return fail(SHORT_RENDER_ERROR_CODES.INVALID_REQUEST);
  }

  const stored = await createAtomRepository().findLatestByAtomId(atomId);
  if (!stored) {
    return fail(SHORT_RENDER_ERROR_CODES.ATOM_NOT_FOUND);
  }

  if (
    input.companyIdHint &&
    stored.company_id.trim().toLowerCase() !==
      input.companyIdHint.trim().toLowerCase()
  ) {
    return fail(SHORT_RENDER_ERROR_CODES.ATOM_NOT_FOUND);
  }

  if (stored.atom.approvalStatus !== "locked") {
    return fail(SHORT_RENDER_ERROR_CODES.ATOM_NOT_LOCKED);
  }

  const atomRevision = stored.record_revision;
  let bundle =
    loadProductionBundle(stored.atom.atom_id, atomRevision) ??
    loadLatestProductionBundle(stored.atom.atom_id);

  if (!bundle || bundle.atomRevision !== atomRevision) {
    return fail(SHORT_RENDER_ERROR_CODES.FORMAT_NOT_FOUND, {
      message: "No production bundle for this atom revision — produce first",
    });
  }

  let shortPkg = bundle.packages.find(
    (p): p is YouTubeShortFormatPackage => p.formatId === "youtube_short"
  );
  if (!shortPkg) {
    return fail(SHORT_RENDER_ERROR_CODES.FORMAT_NOT_FOUND, { bundle });
  }

  const scene = shortPkg.scenes.find((s) => s.id === sceneId);
  if (!scene) {
    return fail(SHORT_RENDER_ERROR_CODES.SCENE_NOT_FOUND, { bundle });
  }

  const assetType = scene.assetType ?? "image";
  if (assetType !== "image") {
    return fail(SHORT_RENDER_ERROR_CODES.UNSUPPORTED_ASSET_TYPE, { bundle });
  }

  if (!scene.visualPrompt.trim()) {
    return fail(SHORT_RENDER_ERROR_CODES.EMPTY_VISUAL_PROMPT, { bundle });
  }

  const sourceRevision = hashSceneRenderSource({
    visualPrompt: scene.visualPrompt,
    assetType,
  });
  const effectivePrompt = composeShortSceneEffectiveImagePrompt(
    shortPkg.globalVisualStyle,
    scene.visualPrompt
  );
  const promptHash = hashEffectiveImagePrompt(effectivePrompt);
  const requestId = `req_${randomUUID()}`;
  const requestedAt = new Date().toISOString();
  const priorAttempt = scene.render?.attempt ?? 0;
  const attempt = priorAttempt + 1;

  const shortRenderInput = shortRenderInputSchema.parse({
    requestId,
    channel: "youtube_short",
    formatId: "youtube_short",
    atomId: stored.atom.atom_id,
    sceneId,
    sceneRevision: sourceRevision,
    outputKind: "image",
    aspectRatio: "9:16",
    effectivePrompt,
    promptHash,
    requestedAt,
  });

  const queued: SceneRenderState = {
    status: "queued",
    requestId,
    mode: "dry_run",
    provider: "dry-run",
    mediaKind: "image",
    promptHash,
    sourceRevision,
    attempt,
    requestedAt,
    updatedAt: requestedAt,
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
      status: "failed",
      requestId,
      mode: "dry_run",
      provider: "dry-run",
      mediaKind: "image",
      promptHash,
      sourceRevision,
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

  // Stale protection: reload durable scene before attaching result.
  const reloaded =
    loadProductionBundle(stored.atom.atom_id, atomRevision) ??
    loadLatestProductionBundle(stored.atom.atom_id);
  if (!reloaded || reloaded.atomRevision !== atomRevision) {
    return fail(SHORT_RENDER_ERROR_CODES.BUNDLE_PERSISTENCE_FAILED, { bundle });
  }
  bundle = reloaded;
  shortPkg = bundle.packages.find(
    (p): p is YouTubeShortFormatPackage => p.formatId === "youtube_short"
  )!;
  const currentScene = shortPkg.scenes.find((s) => s.id === sceneId);
  if (!currentScene) {
    return fail(SHORT_RENDER_ERROR_CODES.SCENE_NOT_FOUND, { bundle });
  }
  const currentRevision = hashSceneRenderSource({
    visualPrompt: currentScene.visualPrompt,
    assetType: currentScene.assetType ?? "image",
  });
  if (currentRevision !== sourceRevision) {
    const stale: SceneRenderState = {
      status: "failed",
      requestId,
      jobId:
        rendererResult.status === "failed" ||
        rendererResult.status === "succeeded"
          ? rendererResult.rendererJobId
          : undefined,
      mode: "dry_run",
      provider: "dry-run",
      mediaKind: "image",
      promptHash,
      sourceRevision,
      attempt,
      requestedAt,
      startedAt: running.startedAt,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: {
        code: SHORT_RENDER_ERROR_CODES.STALE_SCENE_REVISION,
        message: SHORT_RENDER_ERROR_MESSAGES[
          SHORT_RENDER_ERROR_CODES.STALE_SCENE_REVISION
        ],
        retryable: true,
      },
    };
    // Do not overwrite newer scene edits' render if revision diverged mid-flight
    // after a concurrent save that already wrote a different render — only attach
    // stale marker when the in-memory scene still matches our requestId attempt.
    const stillOurs =
      currentScene.render?.requestId === requestId ||
      currentScene.render?.sourceRevision === sourceRevision ||
      currentScene.render?.status === "running" ||
      currentScene.render?.status === "queued";
    if (stillOurs) {
      shortPkg = withSceneRender(shortPkg, sceneId, stale);
      try {
        bundle = await persistShortPackage(bundle, shortPkg);
      } catch {
        /* best-effort */
      }
    }
    return fail(SHORT_RENDER_ERROR_CODES.STALE_SCENE_REVISION, {
      bundle,
      render: stale,
    });
  }

  let finalRender: SceneRenderState;
  if (rendererResult.status === "failed") {
    finalRender = {
      ...mapRendererFailure(rendererResult),
      promptHash,
      sourceRevision,
      attempt,
    };
  } else if (rendererResult.status === "succeeded") {
    if (rendererResult.mode !== "dry_run") {
      finalRender = {
        status: "failed",
        requestId,
        jobId: rendererResult.rendererJobId,
        mode: rendererResult.mode,
        provider: rendererResult.provider,
        mediaKind: "image",
        promptHash,
        sourceRevision,
        attempt,
        requestedAt,
        startedAt: rendererResult.startedAt,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        error: {
          code: SHORT_RENDER_ERROR_CODES.RENDERER_REJECTED_INPUT,
          message: "Unexpected live render mode in Phase 4A",
          retryable: false,
        },
      };
    } else if (rendererResult.assetRef || rendererResult.assetUrl) {
      finalRender = {
        status: "failed",
        requestId,
        jobId: rendererResult.rendererJobId,
        mode: "dry_run",
        provider: rendererResult.provider,
        mediaKind: "image",
        promptHash,
        sourceRevision,
        attempt,
        requestedAt,
        startedAt: rendererResult.startedAt,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        error: {
          code: SHORT_RENDER_ERROR_CODES.RENDERER_REJECTED_INPUT,
          message: "Dry-run result must not include media assets",
          retryable: false,
        },
      };
    } else {
      finalRender = {
        status: "dry_run_succeeded",
        requestId,
        jobId: rendererResult.rendererJobId,
        mode: "dry_run",
        provider: rendererResult.provider,
        mediaKind: "image",
        promptHash,
        sourceRevision,
        attempt,
        requestedAt,
        startedAt: rendererResult.startedAt,
        completedAt: rendererResult.completedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  } else {
    finalRender = {
      status: "failed",
      requestId,
      jobId: rendererResult.rendererJobId,
      mode: rendererResult.mode,
      provider: rendererResult.provider,
      mediaKind: "image",
      promptHash,
      sourceRevision,
      attempt,
      requestedAt,
      startedAt: rendererResult.startedAt,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      error: {
        code: SHORT_RENDER_ERROR_CODES.RENDERER_FAILED,
        message: `Unexpected renderer status: ${rendererResult.status}`,
        retryable: true,
      },
    };
  }

  shortPkg = withSceneRender(shortPkg, sceneId, finalRender);
  try {
    bundle = await persistShortPackage(bundle, shortPkg);
  } catch {
    return fail(SHORT_RENDER_ERROR_CODES.BUNDLE_PERSISTENCE_FAILED, {
      bundle,
      render: finalRender,
    });
  }

  if (finalRender.status === "failed") {
    const code =
      (finalRender.error?.code as ShortRenderErrorCode | undefined) ??
      SHORT_RENDER_ERROR_CODES.RENDERER_FAILED;
    return fail(
      Object.values(SHORT_RENDER_ERROR_CODES).includes(code)
        ? code
        : SHORT_RENDER_ERROR_CODES.RENDERER_FAILED,
      {
        bundle,
        render: finalRender,
        message: finalRender.error?.message,
      }
    );
  }

  const draft = formatPackageToYouTubeShortDraft(shortPkg);

  return {
    ok: true,
    bundle,
    package: shortPkg,
    draft,
    atom: stored.atom,
    validationReport: stored.validation_report ?? null,
    recordRevision: atomRevision,
    sceneId,
    render: finalRender,
    shortRenderInput,
    rendererResult,
  };
}

/** Test helper: read scene card render from a package. */
export function getSceneRenderState(
  pkg: YouTubeShortFormatPackage,
  sceneId: string
): SceneRenderState | undefined {
  const scene: SceneCard | undefined = pkg.scenes.find((s) => s.id === sceneId);
  return scene?.render;
}

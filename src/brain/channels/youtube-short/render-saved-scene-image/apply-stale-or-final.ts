import {
  loadLatestProductionBundle,
  loadProductionBundle,
} from "@/brain/content-studio/bundle-store";
import type {
  ContentProductionBundle,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio/schemas/format-package";
import type { NormalizedRenderResult } from "@/brain/render";

import { hashSceneRenderSource } from "../compose-effective-image-prompt";
import { mapRendererResultToSceneRender } from "../map-renderer-result-to-scene-render";
import {
  SHORT_RENDER_ERROR_CODES,
  SHORT_RENDER_ERROR_MESSAGES,
  type ShortRenderErrorCode,
} from "../render-errors";
import type { SceneRenderState } from "../scene-render-state";
import { formatPackageToYouTubeShortDraft } from "../to-youtube-short-draft";

import { fail } from "./fail";
import {
  persistShortPackage,
  withSceneRender,
} from "./persist-scene-render";
import type { PreparedSceneRender } from "./prepare-scene-render";
import type { RenderSavedSceneImageResult } from "./types";

export async function applyStaleOrFinal(args: {
  prepared: PreparedSceneRender;
  bundle: ContentProductionBundle;
  shortPkg: YouTubeShortFormatPackage;
  running: SceneRenderState;
  rendererResult: NormalizedRenderResult;
}): Promise<RenderSavedSceneImageResult> {
  const {
    prepared,
    running,
    rendererResult,
  } = args;
  let { bundle, shortPkg } = args;
  const {
    atom,
    validationReport,
    atomRevision,
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

  // Stale protection: reload durable scene before attaching result.
  const reloaded =
    loadProductionBundle(atom.atom_id, atomRevision) ??
    loadLatestProductionBundle(atom.atom_id);
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
      visualPromptUsed,
      assetTypeUsed,
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

  const finalRender = mapRendererResultToSceneRender({
    result: rendererResult,
    prior: priorRender,
    promptHash,
    sourceRevision,
    visualPromptUsed,
    assetTypeUsed,
    attempt,
    requestId,
    requestedAt,
    startedAt: running.startedAt,
  });

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
    atom,
    validationReport,
    recordRevision: atomRevision,
    sceneId,
    render: finalRender,
    shortRenderInput,
    rendererResult,
  };
}

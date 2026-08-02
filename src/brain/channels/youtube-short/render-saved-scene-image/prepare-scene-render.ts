import { randomUUID } from "node:crypto";

import type { ContentAtom } from "@/brain/atom";
import type { AtomValidationReport } from "@/brain/atom/validate/types";
import {
  loadLatestProductionBundle,
  loadProductionBundle,
} from "@/brain/content-studio/bundle-store";
import type {
  ContentProductionBundle,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio/schemas/format-package";
import { createAtomRepository } from "@/brain/store";

import {
  composeShortSceneEffectiveImagePrompt,
  hashEffectiveImagePrompt,
  hashSceneRenderSource,
} from "../compose-effective-image-prompt";
import {
  checkInFlight,
  priorSucceededAssetFields,
} from "../in-flight-guard";
import { SHORT_RENDER_ERROR_CODES } from "../render-errors";
import type { SceneRenderState } from "../scene-render-state";
import {
  shortRenderInputSchema,
  type ShortRenderInput,
} from "../short-render-input";
import { persistShortPackage } from "../persist-short-package";

import { fail } from "./fail";
import { withSceneRender } from "./persist-scene-render";
import type {
  RenderSavedSceneImageInput,
  RenderSavedSceneImageResult,
} from "./types";

export type PreparedSceneRender = {
  atom: ContentAtom;
  validationReport: AtomValidationReport | null;
  atomRevision: number;
  bundle: ContentProductionBundle;
  shortPkg: YouTubeShortFormatPackage;
  sceneId: string;
  sourceRevision: string;
  promptHash: string;
  visualPromptUsed: string;
  assetTypeUsed: "image" | "video";
  requestId: string;
  requestedAt: string;
  attempt: number;
  priorRender: SceneRenderState | undefined;
  shortRenderInput: ShortRenderInput;
};

export async function prepareSceneRender(
  input: RenderSavedSceneImageInput
): Promise<
  | { ok: true; prepared: PreparedSceneRender }
  | { ok: false; result: RenderSavedSceneImageResult }
> {
  const atomId = input.atomId.trim();
  const sceneId = input.sceneId.trim();

  if (!atomId || !sceneId) {
    return { ok: false, result: fail(SHORT_RENDER_ERROR_CODES.INVALID_REQUEST) };
  }
  if (input.formatId != null && input.formatId !== "youtube_short") {
    return { ok: false, result: fail(SHORT_RENDER_ERROR_CODES.INVALID_REQUEST) };
  }

  const stored = await createAtomRepository().findLatestByAtomId(atomId);
  if (!stored) {
    return { ok: false, result: fail(SHORT_RENDER_ERROR_CODES.ATOM_NOT_FOUND) };
  }

  if (
    input.companyIdHint &&
    stored.company_id.trim().toLowerCase() !==
      input.companyIdHint.trim().toLowerCase()
  ) {
    return { ok: false, result: fail(SHORT_RENDER_ERROR_CODES.ATOM_NOT_FOUND) };
  }

  if (stored.atom.approvalStatus !== "locked") {
    return { ok: false, result: fail(SHORT_RENDER_ERROR_CODES.ATOM_NOT_LOCKED) };
  }

  const atomRevision = stored.record_revision;
  const bundle =
    loadProductionBundle(stored.atom.atom_id, atomRevision) ??
    loadLatestProductionBundle(stored.atom.atom_id);

  if (!bundle || bundle.atomRevision !== atomRevision) {
    return {
      ok: false,
      result: fail(SHORT_RENDER_ERROR_CODES.FORMAT_NOT_FOUND, {
        message: "No production bundle for this atom revision — produce first",
      }),
    };
  }

  const shortPkg = bundle.packages.find(
    (p): p is YouTubeShortFormatPackage => p.formatId === "youtube_short"
  );
  if (!shortPkg) {
    return {
      ok: false,
      result: fail(SHORT_RENDER_ERROR_CODES.FORMAT_NOT_FOUND, { bundle }),
    };
  }

  let workingPkg = shortPkg;
  let workingBundle = bundle;
  const scene = workingPkg.scenes.find((s) => s.id === sceneId);
  if (!scene) {
    return {
      ok: false,
      result: fail(SHORT_RENDER_ERROR_CODES.SCENE_NOT_FOUND, { bundle }),
    };
  }

  const inFlight = checkInFlight(scene.render, "image");
  if (!inFlight.ok && inFlight.kind === "conflict") {
    return {
      ok: false,
      result: fail(SHORT_RENDER_ERROR_CODES.ALREADY_RUNNING, {
        bundle: workingBundle,
        render: scene.render,
        message: inFlight.error,
      }),
    };
  }
  if (!inFlight.ok && inFlight.kind === "timed_out") {
    const now = new Date().toISOString();
    const recovered: SceneRenderState = {
      ...scene.render!,
      ...priorSucceededAssetFields(scene.render),
      status: "failed",
      updatedAt: now,
      completedAt: now,
      error: {
        code: inFlight.code,
        message: inFlight.error,
        retryable: true,
      },
    };
    workingPkg = withSceneRender(workingPkg, sceneId, recovered);
    try {
      workingBundle = await persistShortPackage(workingBundle, workingPkg);
    } catch {
      /* best-effort */
    }
    return {
      ok: false,
      result: fail(SHORT_RENDER_ERROR_CODES.ALREADY_RUNNING, {
        bundle: workingBundle,
        render: recovered,
        message: inFlight.error,
      }),
    };
  }

  const assetType = scene.assetType ?? "image";
  // Still generation is allowed for both image and video scenes — video stills
  // are the Veo plate. Other asset types remain unsupported if added later.
  if (assetType !== "image" && assetType !== "video") {
    return {
      ok: false,
      result: fail(SHORT_RENDER_ERROR_CODES.UNSUPPORTED_ASSET_TYPE, { bundle }),
    };
  }

  if (!scene.visualPrompt.trim()) {
    return {
      ok: false,
      result: fail(SHORT_RENDER_ERROR_CODES.EMPTY_VISUAL_PROMPT, { bundle }),
    };
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

  return {
    ok: true,
    prepared: {
      atom: stored.atom,
      validationReport: stored.validation_report ?? null,
      atomRevision,
      bundle: workingBundle,
      shortPkg: workingPkg,
      sceneId,
      sourceRevision,
      promptHash,
      visualPromptUsed: scene.visualPrompt,
      assetTypeUsed: assetType,
      requestId,
      requestedAt,
      attempt,
      priorRender: scene.render,
      shortRenderInput,
    },
  };
}

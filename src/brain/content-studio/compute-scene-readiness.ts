import type {
  SceneCard,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio/schemas/format-package";
import {
  isAssetCurrent,
  isAssetStale,
} from "@/brain/channels/youtube-short/asset-stale-rules";
import {
  isFinalShortCurrent,
} from "@/brain/channels/youtube-short/package-assembly-fingerprint";
import {
  isRunningTimedOut,
  type RenderStepKind,
} from "@/brain/channels/youtube-short/in-flight-guard";

export type ReadinessStatus =
  | "missing"
  | "generating"
  | "interrupted"
  | "ready"
  | "outdated"
  | "failed"
  | "not_applicable";

export type SceneAssetReadiness = {
  promptSaved: ReadinessStatus;
  still: ReadinessStatus;
  voice: ReadinessStatus;
  motion: ReadinessStatus;
  composed: ReadinessStatus;
  /** True when all required assets for this scene are Ready. */
  sceneReady: boolean;
};

function textEq(a: string | undefined, b: string | undefined): boolean {
  return (a ?? "").trim() === (b ?? "").trim();
}

function statusFromAsset(
  asset: { status?: string; assetUrl?: string; startedAt?: string; requestedAt?: string } | undefined,
  opts?: {
    requireUrl?: boolean;
    requireDuration?: boolean;
    durationSeconds?: number;
    step?: RenderStepKind;
    provenanceOk?: boolean;
  }
): ReadinessStatus {
  if (!asset) return "missing";
  const st = asset.status;
  if (st === "running" || st === "queued") {
    if (opts?.step && isRunningTimedOut(asset, opts.step)) {
      return "interrupted";
    }
    return "generating";
  }
  if (st === "failed") return "failed";
  if (isAssetStale(st)) return "outdated";
  if (isAssetCurrent(st) || st === "stubbed") {
    // Prior URL retained on failure must never reach here (status is failed).
    // Succeeded/stubbed without matching provenance is outdated, not Ready.
    if (opts?.provenanceOk === false) return "outdated";
    if (
      opts?.requireUrl !== false &&
      !asset.assetUrl &&
      st !== "dry_run_succeeded"
    ) {
      if (st === "dry_run_succeeded") return "ready";
      return "missing";
    }
    if (
      opts?.requireDuration &&
      (opts.durationSeconds == null || !(opts.durationSeconds > 0))
    ) {
      return "missing";
    }
    return "ready";
  }
  return "missing";
}

function stillProvenanceOk(scene: SceneCard): boolean {
  const render = scene.render;
  if (!render || !isAssetCurrent(render.status)) return true;
  // Client-safe: compare stored provenance fields (no node:crypto).
  if (render.visualPromptUsed != null) {
    if (!textEq(scene.visualPrompt, render.visualPromptUsed)) return false;
  }
  if (render.assetTypeUsed != null) {
    if ((scene.assetType ?? "image") !== render.assetTypeUsed) return false;
  }
  return true;
}

function voiceProvenanceOk(scene: SceneCard): boolean {
  const voice = scene.voice;
  if (!voice || !isAssetCurrent(voice.status)) return true;
  if (!voice.scriptUsed) return false;
  return textEq(scene.narration, voice.scriptUsed);
}

function composedProvenanceOk(scene: SceneCard): boolean {
  const composed = scene.composedVideo;
  if (!composed || !isAssetCurrent(composed.status)) return true;
  if (
    composed.onScreenTextUsed != null &&
    !textEq(scene.onScreenText, composed.onScreenTextUsed)
  ) {
    return false;
  }
  if (
    composed.voiceScriptUsed != null &&
    !textEq(scene.narration, composed.voiceScriptUsed)
  ) {
    return false;
  }
  return true;
}

/**
 * AssetType-aware scene readiness for the manual Short production loop.
 * Image scenes: motion is not_applicable.
 * Video scenes: motion required.
 * Ready requires status === succeeded (or stubbed/dry_run) AND provenance match.
 * A retained prior URL with failed/stale status never qualifies as Ready.
 */
export function computeSceneReadiness(input: {
  scene: SceneCard;
  /** False when local editor has unsaved dirty fields for this scene. */
  promptSaved: boolean;
}): SceneAssetReadiness {
  const { scene, promptSaved } = input;
  const assetType = scene.assetType ?? "image";

  const still = statusFromAsset(scene.render, {
    step: "image",
    provenanceOk: stillProvenanceOk(scene),
  });
  const voice = statusFromAsset(scene.voice, {
    requireUrl: true,
    requireDuration: true,
    durationSeconds: scene.voice?.durationSeconds,
    step: "voice",
    provenanceOk: voiceProvenanceOk(scene),
  });
  const motion =
    assetType === "video"
      ? statusFromAsset(scene.video, { step: "video" })
      : ("not_applicable" as const);
  const composed = statusFromAsset(scene.composedVideo, {
    step: "compose",
    provenanceOk: composedProvenanceOk(scene),
  });

  const prompt: ReadinessStatus = promptSaved ? "ready" : "missing";

  const requiredReady =
    prompt === "ready" &&
    still === "ready" &&
    voice === "ready" &&
    (motion === "ready" || motion === "not_applicable") &&
    composed === "ready";

  return {
    promptSaved: prompt,
    still,
    voice,
    motion,
    composed,
    sceneReady: requiredReady,
  };
}

export type PackageAssemblyReadiness = {
  totalScenes: number;
  readyScenes: number;
  sceneIds: string[];
  readySceneIds: string[];
  allReady: boolean;
  label: string;
  /** True when finalShort is succeeded AND sourceHash matches current package. */
  finalShortCurrent: boolean;
};

export function computePackageAssemblyReadiness(
  scenes: SceneCard[],
  /** All scenes treated as prompt-saved when evaluating package assembly from durable state. */
  promptSavedBySceneId?: Record<string, boolean>,
  pkg?: YouTubeShortFormatPackage
): PackageAssemblyReadiness {
  const sceneIds = [...scenes]
    .sort((a, b) => a.order - b.order)
    .map((s) => s.id);
  const readySceneIds: string[] = [];

  for (const scene of [...scenes].sort((a, b) => a.order - b.order)) {
    const promptSaved = promptSavedBySceneId?.[scene.id] ?? true;
    const r = computeSceneReadiness({ scene, promptSaved });
    if (r.sceneReady) readySceneIds.push(scene.id);
  }

  const totalScenes = scenes.length;
  const readyScenes = readySceneIds.length;
  const allReady = totalScenes > 0 && readyScenes === totalScenes;

  let label: string;
  if (totalScenes === 0) {
    label = "Not ready";
  } else if (readyScenes === 0) {
    label = "Not ready";
  } else if (!allReady) {
    label = `${readyScenes} of ${totalScenes} scenes ready`;
  } else {
    label = "Ready to assemble";
  }

  const finalShortCurrent = pkg ? isFinalShortCurrent(pkg) : false;

  return {
    totalScenes,
    readyScenes,
    sceneIds,
    readySceneIds,
    allReady,
    label,
    finalShortCurrent,
  };
}

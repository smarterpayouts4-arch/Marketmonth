import {
  ffmpegConcatSceneClips,
  uploadFinalShortToImageKit,
  runMediaPreflight,
} from "@/brain/render";

import {
  checkInFlight,
  nextAttempt,
  priorSucceededAssetFields,
} from "../in-flight-guard";
import { computePackageAssemblyFingerprint } from "../package-assembly-fingerprint";
import type { PackageFinalShortState } from "../package-final-short-state";
import { persistShortPackage } from "../persist-short-package";
import { preparePackageAssembly } from "../prepare-package-assembly";

import { assertUploadedUrlRetrievable } from "./assert-uploaded-url";
import type {
  AssembleFinalShortDeps,
  AssembleFinalShortInput,
  AssembleFinalShortResult,
} from "./types";

export async function assembleYouTubeShortFinalLocked(
  input: AssembleFinalShortInput,
  deps: AssembleFinalShortDeps
): Promise<AssembleFinalShortResult> {
  const preparedOutcome = await preparePackageAssembly(input);
  if (!preparedOutcome.ok) return preparedOutcome;

  let { bundle, shortPkg } = preparedOutcome.prepared;
  const { atomId, clips } = preparedOutcome.prepared;

  const inFlight = checkInFlight(shortPkg.finalShort, "assemble");
  if (!inFlight.ok && inFlight.kind === "conflict") {
    return {
      ok: false,
      status: inFlight.status,
      error: inFlight.error,
      code: inFlight.code,
      bundle,
      finalShort: shortPkg.finalShort,
    };
  }
  if (!inFlight.ok && inFlight.kind === "timed_out") {
    const now = new Date().toISOString();
    const recovered = {
      ...shortPkg.finalShort,
      ...priorSucceededAssetFields(shortPkg.finalShort),
      status: "failed" as const,
      updatedAt: now,
      completedAt: now,
      error: {
        code: inFlight.code,
        message: inFlight.error,
        retryable: true,
      },
    };
    shortPkg = { ...shortPkg, finalShort: recovered };
    bundle = await persistShortPackage(bundle, shortPkg);
    return {
      ok: false,
      status: 409,
      error: inFlight.error,
      code: inFlight.code,
      bundle,
      finalShort: recovered,
    };
  }

  const prior = shortPkg.finalShort;
  const attempt = nextAttempt(prior);
  const requestedAt = new Date().toISOString();
  const running: PackageFinalShortState = {
    status: "running",
    requestedAt,
    startedAt: requestedAt,
    attempt,
    sceneIds: clips.map((c) => c.sceneId),
    updatedAt: requestedAt,
  };
  shortPkg = { ...shortPkg, finalShort: running };
  bundle = await persistShortPackage(bundle, shortPkg);

  const runConcat = deps.concat ?? ffmpegConcatSceneClips;
  const runUpload = deps.upload ?? uploadFinalShortToImageKit;
  const runPreflight = deps.preflight ?? runMediaPreflight;

  try {
    const concatResult = await runConcat(
      clips.map((c) => ({ sceneId: c.sceneId, url: c.url }))
    );

    const preflight = await runPreflight({
      source: { bytes: concatResult.bytes, hintName: "final-short.mp4" },
      expectAudio: true,
      expectWidth: 1080,
      expectHeight: 1920,
      checkUrlReachable: false,
    });
    if (!preflight.ok) {
      throw new Error(preflight.error);
    }

    const stored = await runUpload({
      atomId,
      bytes: concatResult.bytes,
      mimeType: concatResult.mimeType,
    });

    const urlCheck = await assertUploadedUrlRetrievable(stored.assetUrl);
    if (!urlCheck.ok) {
      throw new Error(urlCheck.error);
    }

    const fingerprint = computePackageAssemblyFingerprint(shortPkg);
    const completedAt = new Date().toISOString();
    const finalShort: PackageFinalShortState = {
      status: "succeeded",
      assetRef: stored.assetRef,
      assetUrl: stored.assetUrl,
      mimeType: stored.mimeType,
      durationSeconds: preflight.durationSeconds,
      width: preflight.width,
      height: preflight.height,
      sceneIds: fingerprint.orderedSceneIds,
      orderedSceneIds: fingerprint.orderedSceneIds,
      orderedComposedAssetIds: fingerprint.orderedComposedAssetIds,
      sourceHash: fingerprint.sourceHash,
      assemblyVersion: fingerprint.assemblyVersion,
      storageProvider: stored.storageProvider,
      storageFileId: stored.storageFileId,
      attempt,
      requestedAt,
      startedAt: requestedAt,
      completedAt,
      updatedAt: completedAt,
    };
    shortPkg = { ...shortPkg, finalShort };
    bundle = await persistShortPackage(bundle, shortPkg);

    return {
      ok: true,
      status: 200,
      atomId,
      finalShort,
      bundle,
      message: "Final Short assembled — ready for manual YouTube upload",
    };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message.slice(0, 400)
        : "Final Short assembly failed";
    const completedAt = new Date().toISOString();
    const finalShort: PackageFinalShortState = {
      status: "failed",
      ...priorSucceededAssetFields(prior),
      sceneIds: clips.map((c) => c.sceneId),
      attempt,
      requestedAt,
      startedAt: requestedAt,
      completedAt,
      updatedAt: completedAt,
      error: {
        code: "short_assemble.provider_failed",
        message,
        retryable: true,
      },
    };
    try {
      shortPkg = { ...shortPkg, finalShort };
      bundle = await persistShortPackage(bundle, shortPkg);
    } catch {
      /* best-effort */
    }
    return {
      ok: false,
      status: 502,
      error: message,
      code: "short_assemble.provider_failed",
      bundle,
      finalShort,
    };
  }
}

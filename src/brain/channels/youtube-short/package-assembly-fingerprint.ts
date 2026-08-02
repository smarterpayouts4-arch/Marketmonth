import type { YouTubeShortFormatPackage } from "@/brain/content-studio/schemas/format-package";

/** Bump when concat pipeline / canonical output format changes. */
export const FINAL_SHORT_ASSEMBLY_VERSION = "manual-short-concat-v1";

export type PackageAssemblyFingerprint = {
  orderedSceneIds: string[];
  orderedComposedAssetIds: string[];
  sourceHash: string;
  assemblyVersion: string;
};

/** Isomorphic FNV-1a style digest (client + server; not a security hash). */
function fingerprintHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0xdeadbeef;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ (c + ((i + 1) << 1)), 0x01000193);
  }
  return (
    (h1 >>> 0).toString(16).padStart(8, "0") +
    (h2 >>> 0).toString(16).padStart(8, "0") +
    ((h1 ^ h2) >>> 0).toString(16).padStart(8, "0") +
    ((h1 + h2) >>> 0).toString(16).padStart(8, "0")
  );
}

/**
 * Fingerprint of what a Final Short assembly would include right now.
 * Ready downloads require finalShort.sourceHash === this sourceHash.
 */
export function computePackageAssemblyFingerprint(
  pkg: YouTubeShortFormatPackage
): PackageAssemblyFingerprint {
  const ordered = [...pkg.scenes].sort((a, b) => a.order - b.order);
  const orderedSceneIds = ordered.map((s) => s.id);
  const orderedComposedAssetIds = ordered.map((s) => {
    const c = s.composedVideo;
    return (
      c?.assetRef?.trim() ||
      c?.storageFileId?.trim() ||
      c?.assetUrl?.trim() ||
      ""
    );
  });

  const payload = JSON.stringify({
    assemblyVersion: FINAL_SHORT_ASSEMBLY_VERSION,
    orderedSceneIds,
    orderedComposedAssetIds,
    statuses: ordered.map((s) => s.composedVideo?.status ?? "missing"),
  });
  const sourceHash = fingerprintHash(payload);

  return {
    orderedSceneIds,
    orderedComposedAssetIds,
    sourceHash,
    assemblyVersion: FINAL_SHORT_ASSEMBLY_VERSION,
  };
}

/** True when package finalShort is a current assembly of today's scene clips. */
export function isFinalShortCurrent(
  pkg: YouTubeShortFormatPackage
): boolean {
  const final = pkg.finalShort;
  if (!final || final.status !== "succeeded" || !final.assetUrl) {
    return false;
  }
  if (!final.sourceHash || !final.assemblyVersion) {
    return false;
  }
  const fp = computePackageAssemblyFingerprint(pkg);
  return (
    final.sourceHash === fp.sourceHash &&
    final.assemblyVersion === fp.assemblyVersion
  );
}

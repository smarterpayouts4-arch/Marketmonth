/** True when an asset counts as current/ready for assembly or compose gates. */
export function isAssetCurrent(
  status: string | undefined
): boolean {
  return status === "succeeded" || status === "dry_run_succeeded";
}

/** True when asset exists with a URL but is outdated. */
export function isAssetStale(status: string | undefined): boolean {
  return status === "stale";
}

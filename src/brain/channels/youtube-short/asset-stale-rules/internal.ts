/** Asset statuses that still represent a usable (but possibly outdated) URL. */
export const MARKABLE: ReadonlySet<string> = new Set([
  "succeeded",
  "dry_run_succeeded",
  "stubbed",
]);

export function markStale<T extends { status: string; updatedAt?: string }>(
  asset: T | undefined,
  now: string
): T | undefined {
  if (!asset || !MARKABLE.has(asset.status)) return asset;
  return {
    ...asset,
    status: "stale",
    updatedAt: now,
  };
}

export function textEq(a: string | undefined, b: string | undefined): boolean {
  return (a ?? "").trim() === (b ?? "").trim();
}

import type { ContentProductionBundle } from "@/brain/content-studio";

export type FetchBundleResult =
  | {
      ok: true;
      bundle: ContentProductionBundle;
      warnings: string[];
      loadedExisting: boolean;
    }
  | { ok: false; error: string };

export async function fetchExistingProductionBundle(
  atomId: string
): Promise<FetchBundleResult | null> {
  const getRes = await fetch(
    `/api/brain/content/production?atomId=${encodeURIComponent(atomId)}`
  );
  if (!getRes.ok) return null;
  const getData = (await getRes.json()) as {
    ok: boolean;
    bundle?: ContentProductionBundle;
    warnings?: string[];
  };
  if (!getData.ok || !getData.bundle) return null;
  return {
    ok: true,
    bundle: getData.bundle,
    warnings: getData.warnings ?? [],
    loadedExisting: true,
  };
}

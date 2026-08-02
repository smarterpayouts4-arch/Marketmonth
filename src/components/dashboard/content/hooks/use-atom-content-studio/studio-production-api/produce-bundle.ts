import type {
  ContentFormatId,
  ContentProductionBundle,
} from "@/brain/content-studio";

import type { FetchBundleResult } from "./fetch-bundle";

export async function produceProductionBundle(input: {
  atomId: string;
  forceRegenerate: boolean;
  formatIds: ContentFormatId[];
}): Promise<FetchBundleResult> {
  const res = await fetch("/api/brain/content/production", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      atomId: input.atomId,
      forceRegenerate: input.forceRegenerate,
      formatIds: input.formatIds,
    }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    bundle?: ContentProductionBundle;
    warnings?: string[];
    loadedExisting?: boolean;
  };
  if (!res.ok || !data.ok || !data.bundle) {
    return {
      ok: false,
      error: data.error ?? "Could not produce content packages",
    };
  }
  return {
    ok: true,
    bundle: data.bundle,
    warnings: data.warnings ?? [],
    loadedExisting: Boolean(data.loadedExisting),
  };
}

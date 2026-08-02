import type { ContentProductionBundle } from "@/brain/content-studio";

export type RenderSceneImageResult =
  | {
      ok: true;
      bundle: ContentProductionBundle;
      message: string;
    }
  | {
      ok: false;
      error: string;
      bundle?: ContentProductionBundle;
    };

/** Generate/regenerate a saved Short scene image (live or dry-run by server config). */
export async function renderSavedSceneImageRequest(input: {
  atomId: string;
  sceneId: string;
}): Promise<RenderSceneImageResult> {
  const res = await fetch("/api/brain/content/production/render-scene-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      atomId: input.atomId,
      formatId: "youtube_short",
      sceneId: input.sceneId,
    }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    bundle?: ContentProductionBundle;
    message?: string;
  };
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error: data.error ?? "Could not generate scene image",
      bundle: data.bundle,
    };
  }
  if (!data.bundle) {
    return { ok: false, error: "Could not generate scene image" };
  }
  return {
    ok: true,
    bundle: data.bundle,
    message: data.message ?? "Image generated",
  };
}

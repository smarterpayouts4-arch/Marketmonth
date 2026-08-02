import type { ContentProductionBundle } from "@/brain/content-studio";

export type RenderSceneVideoResult =
  | {
      ok: true;
      bundle: ContentProductionBundle;
      message: string;
      durationVerified: boolean;
    }
  | {
      ok: false;
      error: string;
      bundle?: ContentProductionBundle;
    };

/** Generate image-to-video for a saved Short scene still + visualPrompt. */
export async function renderSavedSceneVideoRequest(input: {
  atomId: string;
  sceneId: string;
}): Promise<RenderSceneVideoResult> {
  const res = await fetch("/api/brain/content/production/render-scene-video", {
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
    durationVerified?: boolean;
  };
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error: data.error ?? "Could not generate scene video",
      bundle: data.bundle,
    };
  }
  if (!data.bundle) {
    return { ok: false, error: "Could not generate scene video" };
  }
  return {
    ok: true,
    bundle: data.bundle,
    message: data.message ?? "Video generated",
    durationVerified: Boolean(data.durationVerified),
  };
}

import type { ContentProductionBundle } from "@/brain/content-studio";

export type RenderSceneComposedVideoResult =
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

/** Compose still + title + voice into a durable scene MP4. */
export async function renderSavedSceneComposedVideoRequest(input: {
  atomId: string;
  sceneId: string;
}): Promise<RenderSceneComposedVideoResult> {
  const res = await fetch(
    "/api/brain/content/production/render-scene-composed-video",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        atomId: input.atomId,
        formatId: "youtube_short",
        sceneId: input.sceneId,
      }),
    }
  );
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
      error: data.error ?? "Could not compose scene MP4",
      bundle: data.bundle,
    };
  }
  if (!data.bundle) {
    return { ok: false, error: "Could not compose scene MP4" };
  }
  return {
    ok: true,
    bundle: data.bundle,
    message: data.message ?? "Scene MP4 composed",
    durationVerified: Boolean(data.durationVerified),
  };
}

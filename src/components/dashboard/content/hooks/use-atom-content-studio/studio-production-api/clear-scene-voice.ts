import type { ContentProductionBundle } from "@/brain/content-studio";

export type ClearSceneVoiceResult =
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

/** Clear persisted voice for a saved Short scene. */
export async function clearSavedSceneVoiceRequest(input: {
  atomId: string;
  sceneId: string;
}): Promise<ClearSceneVoiceResult> {
  const params = new URLSearchParams({
    atomId: input.atomId,
    sceneId: input.sceneId,
    formatId: "youtube_short",
  });
  const res = await fetch(
    `/api/brain/content/production/render-scene-voice?${params.toString()}`,
    { method: "DELETE" }
  );
  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    bundle?: ContentProductionBundle;
    message?: string;
  };
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error: data.error ?? "Could not clear scene voice",
      bundle: data.bundle,
    };
  }
  if (!data.bundle) {
    return { ok: false, error: "Could not clear scene voice" };
  }
  return {
    ok: true,
    bundle: data.bundle,
    message: data.message ?? "Voice cleared",
  };
}

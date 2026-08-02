import type { ContentProductionBundle } from "@/brain/content-studio";

export type RenderSceneVoiceResult =
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

/** Generate voiceover for a saved Short scene narration. */
export async function renderSavedSceneVoiceRequest(input: {
  atomId: string;
  sceneId: string;
}): Promise<RenderSceneVoiceResult> {
  const res = await fetch("/api/brain/content/production/render-scene-voice", {
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
      error: data.error ?? "Could not generate scene voice",
      bundle: data.bundle,
    };
  }
  if (!data.bundle) {
    return { ok: false, error: "Could not generate scene voice" };
  }
  return {
    ok: true,
    bundle: data.bundle,
    message: data.message ?? "Voice generated",
    durationVerified: Boolean(data.durationVerified),
  };
}

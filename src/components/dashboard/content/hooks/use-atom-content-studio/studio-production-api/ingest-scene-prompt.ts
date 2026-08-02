import type { SceneEditFields } from "../types";

export type IngestScenePromptResult =
  | { ok: true; extracted: SceneEditFields }
  | { ok: false; error: string };

export async function ingestScenePromptRequest(input: {
  atomId: string;
  sceneId: string;
  prompt: string;
}): Promise<IngestScenePromptResult> {
  const res = await fetch("/api/brain/content/production/ingest-scene-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      atomId: input.atomId,
      formatId: "youtube_short",
      sceneId: input.sceneId,
      prompt: input.prompt,
    }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    extracted?: SceneEditFields;
  };
  if (!res.ok || !data.ok || !data.extracted) {
    return {
      ok: false,
      error: data.error ?? "Could not extract scene fields",
    };
  }
  return { ok: true, extracted: data.extracted };
}

import type { ContentProductionBundle } from "@/brain/content-studio";

import type { ScenePatch } from "../package-edit-helpers";

export type PatchBundleResult =
  | {
      ok: true;
      bundle: ContentProductionBundle;
      selectedSceneIdHint?: string;
    }
  | { ok: false; error: string };

export type ShortPatchBody = {
  atomId: string;
  edits?: {
    scenes?: Record<string, ScenePatch>;
    globalVisualStyle?: string;
    imagePrompt?: string;
    voiceoverPrompt?: string;
    script?: string;
  };
  resetToGenerated?: boolean;
  resetSceneId?: string;
  sceneStructure?: {
    setCount?: number;
    addScene?: true;
    removeSceneId?: string;
  };
};

export async function patchShortDurableEdits(
  input: ShortPatchBody
): Promise<PatchBundleResult> {
  const res = await fetch("/api/brain/content/production", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      atomId: input.atomId,
      formatId: "youtube_short",
      ...(input.edits ? { edits: input.edits } : {}),
      ...(input.resetToGenerated ? { resetToGenerated: true } : {}),
      ...(input.resetSceneId ? { resetSceneId: input.resetSceneId } : {}),
      ...(input.sceneStructure ? { sceneStructure: input.sceneStructure } : {}),
    }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    bundle?: ContentProductionBundle;
    selectedSceneIdHint?: string;
  };
  if (!res.ok || !data.ok || !data.bundle) {
    return { ok: false, error: data.error ?? "Request failed" };
  }
  return {
    ok: true,
    bundle: data.bundle,
    selectedSceneIdHint: data.selectedSceneIdHint,
  };
}

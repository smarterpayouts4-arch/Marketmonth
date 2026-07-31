import type {
  AtomValidationReport,
  ContentAtom,
} from "@/brain/atom";
import type {
  ContentFormatId,
  ContentProductionBundle,
} from "@/brain/content-studio";

import type { ScenePatch } from "./package-edit-helpers";
import type { SceneEditFields } from "./types";

export type FetchAtomResult =
  | {
      ok: true;
      atom: ContentAtom;
      validation: AtomValidationReport | null;
      recordRevision: number;
      companyId: string;
      buildKey: string | null;
    }
  | { ok: false; error: string; statusCode: number };

export async function fetchContentAtom(atomId: string): Promise<FetchAtomResult> {
  const res = await fetch(
    `/api/brain/content-atom?atomId=${encodeURIComponent(atomId)}`
  );
  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    atom?: ContentAtom;
    validation?: AtomValidationReport | null;
    recordRevision?: number;
    companyId?: string;
    buildKey?: string | null;
  };
  if (!res.ok || !data.ok || !data.atom) {
    return {
      ok: false,
      error: data.error ?? "Could not load atom",
      statusCode: res.status,
    };
  }
  return {
    ok: true,
    atom: data.atom,
    validation: data.validation ?? null,
    recordRevision: data.recordRevision ?? 1,
    companyId: data.companyId ?? data.atom.lineage.companyId,
    buildKey: data.buildKey ?? null,
  };
}

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

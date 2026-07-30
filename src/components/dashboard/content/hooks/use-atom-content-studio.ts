"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  AtomValidationReport,
  ContentAtom,
} from "@/brain/atom";
import type {
  ContentFormatId,
  ContentFormatPackage,
  ContentProductionBundle,
  PlatformId,
  SceneCard,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio";

export type StudioPromptMode = "generated" | "manual";

export type SceneAssetType = "image" | "video";

export type SceneEditFields = {
  visualPrompt: string;
  narration: string;
  onScreenText: string;
  assetType: SceneAssetType;
};

type AtomLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ready";
      atom: ContentAtom;
      validation: AtomValidationReport | null;
      recordRevision: number;
      companyId: string;
      buildKey: string | null;
    }
  | { status: "error"; error: string; statusCode?: number };

type BundleState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ready";
      bundle: ContentProductionBundle;
      warnings: string[];
      loadedExisting: boolean;
    }
  | { status: "error"; error: string };

/** Package-level durable-edit fields. */
type FormatEdits = {
  imagePrompt: string;
  voiceoverPrompt: string;
  script: string;
};

const EMPTY_EDITS: FormatEdits = {
  imagePrompt: "",
  voiceoverPrompt: "",
  script: "",
};

const EMPTY_SCENE: SceneEditFields = {
  visualPrompt: "",
  narration: "",
  onScreenText: "",
  assetType: "image",
};

function isShortPackage(
  pkg: ContentFormatPackage
): pkg is YouTubeShortFormatPackage {
  return pkg.formatId === "youtube_short";
}

function editsFromPackage(pkg: ContentFormatPackage): FormatEdits {
  return {
    imagePrompt: pkg.imagePrompt,
    voiceoverPrompt: pkg.voiceoverPrompt,
    script: pkg.script,
  };
}

function baselineEditsFromPackage(pkg: ContentFormatPackage): FormatEdits {
  if (isShortPackage(pkg) && pkg.generatedBaseline) {
    return {
      imagePrompt: pkg.generatedBaseline.imagePrompt,
      voiceoverPrompt: pkg.generatedBaseline.voiceoverPrompt,
      script: pkg.generatedBaseline.script,
    };
  }
  return editsFromPackage(pkg);
}

function sceneFieldsFromScene(scene: SceneCard): SceneEditFields {
  return {
    visualPrompt: scene.visualPrompt,
    narration: scene.narration,
    onScreenText: scene.onScreenText ?? "",
    assetType: scene.assetType ?? "image",
  };
}

function baselineSceneFields(
  pkg: YouTubeShortFormatPackage,
  sceneId: string
): SceneEditFields {
  const baseline = pkg.generatedBaseline?.scenes?.[sceneId];
  if (baseline) {
    return {
      visualPrompt: baseline.visualPrompt,
      narration: baseline.narration,
      onScreenText: baseline.onScreenText ?? "",
      assetType: baseline.assetType,
    };
  }
  const scene = pkg.scenes.find((s) => s.id === sceneId);
  return scene ? sceneFieldsFromScene(scene) : EMPTY_SCENE;
}

function sceneEditsFromPackage(
  pkg: YouTubeShortFormatPackage
): Record<string, SceneEditFields> {
  const out: Record<string, SceneEditFields> = {};
  for (const scene of pkg.scenes) {
    out[scene.id] = sceneFieldsFromScene(scene);
  }
  return out;
}

function shortHasDurableEdits(pkg: ContentFormatPackage | null): boolean {
  if (!pkg || !isShortPackage(pkg) || !pkg.durableEdits) return false;
  const d = pkg.durableEdits;
  return Boolean(
    d.imagePrompt !== undefined ||
      d.voiceoverPrompt !== undefined ||
      d.script !== undefined ||
      (d.scenes && Object.keys(d.scenes).length > 0)
  );
}

function shortPackageSyncKey(pkg: ContentFormatPackage | null): string | null {
  if (!pkg || !isShortPackage(pkg)) return null;
  const durable = pkg.durableEdits
    ? JSON.stringify(pkg.durableEdits)
    : "none";
  const scenes = pkg.scenes
    .map(
      (s) =>
        `${s.id}:${s.visualPrompt}|${s.narration}|${s.onScreenText ?? ""}|${s.assetType ?? "image"}`
    )
    .join(";");
  return [
    pkg.id,
    pkg.generation.idempotencyKey,
    durable,
    pkg.imagePrompt,
    pkg.voiceoverPrompt,
    pkg.script,
    scenes,
  ].join("::");
}

function buildScenePatches(
  pkg: YouTubeShortFormatPackage,
  localById: Record<string, SceneEditFields>
): Record<
  string,
  {
    visualPrompt?: string;
    narration?: string;
    onScreenText?: string;
    assetType?: SceneAssetType;
  }
> {
  const patches: Record<
    string,
    {
      visualPrompt?: string;
      narration?: string;
      onScreenText?: string;
      assetType?: SceneAssetType;
    }
  > = {};
  for (const scene of pkg.scenes) {
    const local = localById[scene.id];
    if (!local) continue;
    const current = sceneFieldsFromScene(scene);
    const patch: {
      visualPrompt?: string;
      narration?: string;
      onScreenText?: string;
      assetType?: SceneAssetType;
    } = {};
    if (local.visualPrompt !== current.visualPrompt) {
      patch.visualPrompt = local.visualPrompt;
    }
    if (local.narration !== current.narration) {
      patch.narration = local.narration;
    }
    if (local.onScreenText !== current.onScreenText) {
      patch.onScreenText = local.onScreenText;
    }
    if (local.assetType !== current.assetType) {
      patch.assetType = local.assetType;
    }
    if (Object.keys(patch).length > 0) {
      patches[scene.id] = patch;
    }
  }
  return patches;
}

export function useAtomContentStudio(atomId: string | null) {
  const [atomState, setAtomState] = useState<AtomLoadState>({ status: "idle" });
  const [bundleState, setBundleState] = useState<BundleState>({ status: "idle" });
  const [platform, setPlatform] = useState<PlatformId>("youtube");
  const [formatId, setFormatId] = useState<ContentFormatId>("youtube_short");
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [editsByFormat, setEditsByFormat] = useState<
    Partial<Record<ContentFormatId, FormatEdits>>
  >({});
  const [sceneEditsById, setSceneEditsById] = useState<
    Record<string, SceneEditFields>
  >({});
  const [promptMode, setPromptModeState] =
    useState<StudioPromptMode>("generated");
  const [saveLabel, setSaveLabel] = useState("Save draft");
  const atomRequestRef = useRef(0);
  const bundleRequestRef = useRef(0);

  const loadAtom = useCallback(async (id: string) => {
    const requestId = ++atomRequestRef.current;
    setAtomState({ status: "loading" });
    try {
      const res = await fetch(
        `/api/brain/content-atom?atomId=${encodeURIComponent(id)}`
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
      if (atomRequestRef.current !== requestId) return;
      if (!res.ok || !data.ok || !data.atom) {
        setAtomState({
          status: "error",
          error: data.error ?? "Could not load atom",
          statusCode: res.status,
        });
        return;
      }
      setAtomState({
        status: "ready",
        atom: data.atom,
        validation: data.validation ?? null,
        recordRevision: data.recordRevision ?? 1,
        companyId: data.companyId ?? data.atom.lineage.companyId,
        buildKey: data.buildKey ?? null,
      });
    } catch {
      if (atomRequestRef.current !== requestId) return;
      setAtomState({ status: "error", error: "Network error loading atom" });
    }
  }, []);

  const loadOrProduceBundle = useCallback(
    async (
      id: string,
      forceRegenerate = false,
      formatIds: ContentFormatId[] = ["youtube_short", "youtube_video"]
    ) => {
      const requestId = ++bundleRequestRef.current;
      setBundleState({ status: "loading" });
      try {
        if (!forceRegenerate) {
          const getRes = await fetch(
            `/api/brain/content/production?atomId=${encodeURIComponent(id)}`
          );
          if (bundleRequestRef.current !== requestId) return;
          if (getRes.ok) {
            const getData = (await getRes.json()) as {
              ok: boolean;
              bundle?: ContentProductionBundle;
              warnings?: string[];
            };
            if (getData.ok && getData.bundle) {
              setBundleState({
                status: "ready",
                bundle: getData.bundle,
                warnings: getData.warnings ?? [],
                loadedExisting: true,
              });
              setEditsByFormat({});
              setSceneEditsById({});
              return;
            }
          }
        }

        const res = await fetch("/api/brain/content/production", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            atomId: id,
            forceRegenerate,
            formatIds,
          }),
        });
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          bundle?: ContentProductionBundle;
          warnings?: string[];
          loadedExisting?: boolean;
        };
        if (bundleRequestRef.current !== requestId) return;
        if (!res.ok || !data.ok || !data.bundle) {
          setBundleState({
            status: "error",
            error: data.error ?? "Could not produce content packages",
          });
          return;
        }
        setBundleState({
          status: "ready",
          bundle: data.bundle,
          warnings: data.warnings ?? [],
          loadedExisting: Boolean(data.loadedExisting),
        });
        setEditsByFormat({});
        setSceneEditsById({});
      } catch {
        if (bundleRequestRef.current !== requestId) return;
        setBundleState({
          status: "error",
          error: "Network error producing content",
        });
      }
    },
    []
  );

  useEffect(() => {
    if (!atomId?.trim()) {
      setAtomState({ status: "idle" });
      return;
    }
    void loadAtom(atomId.trim());
  }, [atomId, loadAtom]);

  useEffect(() => {
    if (atomState.status !== "ready") return;
    if (atomState.atom.approvalStatus !== "locked") {
      setBundleState({ status: "idle" });
      return;
    }
    void loadOrProduceBundle(atomState.atom.atom_id);
  }, [atomState, loadOrProduceBundle]);

  const packages = useMemo(
    () =>
      bundleState.status === "ready" ? bundleState.bundle.packages : [],
    [bundleState]
  );

  const activePackage =
    packages.find((p) => p.formatId === formatId) ?? null;

  const shortSyncKey = shortPackageSyncKey(
    formatId === "youtube_short" ? activePackage : null
  );

  useEffect(() => {
    if (!shortSyncKey || formatId !== "youtube_short") return;
    const pkg = packages.find((p) => p.formatId === "youtube_short");
    if (!pkg || !isShortPackage(pkg)) return;
    setEditsByFormat((prev) => ({
      ...prev,
      youtube_short: editsFromPackage(pkg),
    }));
    setSceneEditsById(sceneEditsFromPackage(pkg));
    setPromptModeState(shortHasDurableEdits(pkg) ? "manual" : "generated");
    setSelectedSceneId((prev) => {
      if (prev && pkg.scenes.some((s) => s.id === prev)) return prev;
      return pkg.scenes[0]?.id ?? null;
    });
  }, [shortSyncKey, formatId, packages]);

  useEffect(() => {
    if (!activePackage || formatId === "youtube_short") return;
    setEditsByFormat((prev) => {
      if (prev[formatId]) return prev;
      return { ...prev, [formatId]: editsFromPackage(activePackage) };
    });
    setSelectedSceneId((prev) => prev ?? activePackage.scenes[0]?.id ?? null);
  }, [activePackage, formatId]);

  const edits = useMemo(() => {
    if (
      formatId === "youtube_short" &&
      promptMode === "generated" &&
      activePackage
    ) {
      return baselineEditsFromPackage(activePackage);
    }
    return (
      editsByFormat[formatId] ??
      (activePackage ? editsFromPackage(activePackage) : EMPTY_EDITS)
    );
  }, [activePackage, editsByFormat, formatId, promptMode]);

  const selectedSceneEdits = useMemo((): SceneEditFields => {
    if (!selectedSceneId) return EMPTY_SCENE;
    if (
      formatId === "youtube_short" &&
      promptMode === "generated" &&
      activePackage &&
      isShortPackage(activePackage)
    ) {
      return baselineSceneFields(activePackage, selectedSceneId);
    }
    return sceneEditsById[selectedSceneId] ?? EMPTY_SCENE;
  }, [
    activePackage,
    formatId,
    promptMode,
    sceneEditsById,
    selectedSceneId,
  ]);

  const dirty = useMemo(() => {
    if (!activePackage) return false;
    if (formatId === "youtube_short" && promptMode !== "manual") return false;
    const base = editsFromPackage(activePackage);
    const packageDirty =
      edits.imagePrompt !== base.imagePrompt ||
      edits.voiceoverPrompt !== base.voiceoverPrompt ||
      edits.script !== base.script;
    if (packageDirty) return true;
    if (formatId === "youtube_short" && isShortPackage(activePackage)) {
      const patches = buildScenePatches(activePackage, sceneEditsById);
      return Object.keys(patches).length > 0;
    }
    return false;
  }, [activePackage, edits, formatId, promptMode, sceneEditsById]);

  const setPromptMode = useCallback(
    (mode: StudioPromptMode) => {
      if (formatId !== "youtube_short" || !activePackage) return;
      if (!isShortPackage(activePackage)) return;
      setEditsByFormat((prev) => ({
        ...prev,
        youtube_short: editsFromPackage(activePackage),
      }));
      setSceneEditsById(sceneEditsFromPackage(activePackage));
      if (mode === "generated") {
        setSaveLabel("Save draft");
      }
      setPromptModeState(mode);
    },
    [activePackage, formatId]
  );

  const setEditField = useCallback(
    (field: keyof FormatEdits, value: string) => {
      if (formatId === "youtube_short" && promptMode !== "manual") return;
      setEditsByFormat((prev) => ({
        ...prev,
        [formatId]: {
          ...(prev[formatId] ?? EMPTY_EDITS),
          [field]: value,
        },
      }));
      setSaveLabel("Unsaved changes");
    },
    [formatId, promptMode]
  );

  const setSceneEditField = useCallback(
    <K extends keyof SceneEditFields>(field: K, value: SceneEditFields[K]) => {
      if (
        formatId !== "youtube_short" ||
        promptMode !== "manual" ||
        !selectedSceneId
      ) {
        return;
      }
      setSceneEditsById((prev) => ({
        ...prev,
        [selectedSceneId]: {
          ...(prev[selectedSceneId] ?? EMPTY_SCENE),
          [field]: value,
        },
      }));
      setSaveLabel("Unsaved changes");
    },
    [formatId, promptMode, selectedSceneId]
  );

  const saveEdits = useCallback(async () => {
    if (atomState.status !== "ready") return;
    if (formatId !== "youtube_short") {
      setSaveLabel("Video edits not persisted yet");
      return;
    }
    if (promptMode !== "manual") {
      setSaveLabel("Switch to Manual to edit");
      return;
    }
    if (!activePackage || !isShortPackage(activePackage)) return;

    const packageBase = editsFromPackage(activePackage);
    const packagePatch: {
      imagePrompt?: string;
      voiceoverPrompt?: string;
      script?: string;
    } = {};
    if (edits.imagePrompt !== packageBase.imagePrompt) {
      packagePatch.imagePrompt = edits.imagePrompt;
    }
    if (edits.voiceoverPrompt !== packageBase.voiceoverPrompt) {
      packagePatch.voiceoverPrompt = edits.voiceoverPrompt;
    }
    if (edits.script !== packageBase.script) {
      packagePatch.script = edits.script;
    }
    const scenePatches = buildScenePatches(activePackage, sceneEditsById);
    const hasPackage = Object.keys(packagePatch).length > 0;
    const hasScenes = Object.keys(scenePatches).length > 0;
    if (!hasPackage && !hasScenes) {
      setSaveLabel("Save draft");
      return;
    }

    setSaveLabel("Saving…");
    try {
      const res = await fetch("/api/brain/content/production", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          atomId: atomState.atom.atom_id,
          formatId: "youtube_short",
          edits: {
            ...packagePatch,
            ...(hasScenes ? { scenes: scenePatches } : {}),
          },
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        bundle?: ContentProductionBundle;
      };
      if (!res.ok || !data.ok || !data.bundle) {
        setSaveLabel(data.error ?? "Save failed");
        return;
      }
      setBundleState({
        status: "ready",
        bundle: data.bundle,
        warnings: [],
        loadedExisting: true,
      });
      const pkg = data.bundle.packages.find(
        (p): p is YouTubeShortFormatPackage => p.formatId === "youtube_short"
      );
      if (pkg) {
        setEditsByFormat((prev) => ({
          ...prev,
          youtube_short: editsFromPackage(pkg),
        }));
        setSceneEditsById(sceneEditsFromPackage(pkg));
      }
      setPromptModeState("manual");
      setSaveLabel("Saved");
    } catch {
      setSaveLabel("Save failed");
    }
  }, [
    activePackage,
    atomState,
    edits,
    formatId,
    promptMode,
    sceneEditsById,
  ]);

  const resetEdits = useCallback(async () => {
    if (atomState.status !== "ready" || !activePackage) return;
    if (formatId !== "youtube_short") {
      setEditsByFormat((prev) => ({
        ...prev,
        [formatId]: editsFromPackage(activePackage),
      }));
      setSaveLabel("Save draft");
      return;
    }
    setSaveLabel("Resetting…");
    try {
      const res = await fetch("/api/brain/content/production", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          atomId: atomState.atom.atom_id,
          formatId: "youtube_short",
          resetToGenerated: true,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        bundle?: ContentProductionBundle;
      };
      if (!res.ok || !data.ok || !data.bundle) {
        setSaveLabel(data.error ?? "Reset failed");
        return;
      }
      setBundleState({
        status: "ready",
        bundle: data.bundle,
        warnings: [],
        loadedExisting: true,
      });
      const pkg = data.bundle.packages.find(
        (p): p is YouTubeShortFormatPackage => p.formatId === "youtube_short"
      );
      if (pkg) {
        setEditsByFormat((prev) => ({
          ...prev,
          youtube_short: editsFromPackage(pkg),
        }));
        setSceneEditsById(sceneEditsFromPackage(pkg));
      }
      setPromptModeState("generated");
      setSaveLabel("Save draft");
    } catch {
      setSaveLabel("Reset failed");
    }
  }, [activePackage, atomState, formatId]);

  const resetSelectedScene = useCallback(async () => {
    if (atomState.status !== "ready" || !selectedSceneId) return;
    if (formatId !== "youtube_short") return;
    setSaveLabel("Resetting scene…");
    try {
      const res = await fetch("/api/brain/content/production", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          atomId: atomState.atom.atom_id,
          formatId: "youtube_short",
          resetSceneId: selectedSceneId,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        bundle?: ContentProductionBundle;
      };
      if (!res.ok || !data.ok || !data.bundle) {
        setSaveLabel(data.error ?? "Reset scene failed");
        return;
      }
      setBundleState({
        status: "ready",
        bundle: data.bundle,
        warnings: [],
        loadedExisting: true,
      });
      const pkg = data.bundle.packages.find(
        (p): p is YouTubeShortFormatPackage => p.formatId === "youtube_short"
      );
      if (pkg) {
        setEditsByFormat((prev) => ({
          ...prev,
          youtube_short: editsFromPackage(pkg),
        }));
        setSceneEditsById(sceneEditsFromPackage(pkg));
        setPromptModeState(shortHasDurableEdits(pkg) ? "manual" : "generated");
      }
      setSaveLabel("Save draft");
    } catch {
      setSaveLabel("Reset scene failed");
    }
  }, [atomState, formatId, selectedSceneId]);

  const regenerate = useCallback(
    (formatIds?: ContentFormatId[]) => {
      if (atomState.status !== "ready") return;
      void loadOrProduceBundle(atomState.atom.atom_id, true, formatIds ?? [
        formatId,
      ]);
    },
    [atomState, formatId, loadOrProduceBundle]
  );

  return {
    atomState,
    bundleState,
    platform,
    setPlatform,
    formatId,
    setFormatId,
    packages,
    activePackage,
    selectedSceneId,
    setSelectedSceneId,
    promptMode,
    setPromptMode,
    edits,
    setEditField,
    selectedSceneEdits,
    setSceneEditField,
    dirty,
    saveLabel,
    saveEdits,
    resetEdits,
    resetSelectedScene,
    regenerate,
    reloadAtom: () => (atomId ? loadAtom(atomId) : undefined),
  };
}

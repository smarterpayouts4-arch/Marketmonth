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
  YouTubeShortFormatPackage,
} from "@/brain/content-studio";

export type StudioPromptMode = "generated" | "manual";

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

/** Durable-edit fields only — matches youtubeShortDurableEditsSchema. */
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
    return { ...pkg.generatedBaseline };
  }
  return editsFromPackage(pkg);
}

function shortHasDurableEdits(pkg: ContentFormatPackage | null): boolean {
  return Boolean(pkg && isShortPackage(pkg) && pkg.durableEdits);
}

function shortPackageSyncKey(pkg: ContentFormatPackage | null): string | null {
  if (!pkg || !isShortPackage(pkg)) return null;
  const durable = pkg.durableEdits
    ? `${pkg.durableEdits.imagePrompt}|${pkg.durableEdits.voiceoverPrompt}|${pkg.durableEdits.script}`
    : "none";
  return [
    pkg.id,
    pkg.generation.idempotencyKey,
    durable,
    pkg.imagePrompt,
    pkg.voiceoverPrompt,
    pkg.script,
  ].join("::");
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
        // Reload edits from persisted package (merge policy may re-apply durable edits).
        setEditsByFormat({});
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

  // Seed Short edits + mode from persisted package (load / save / reset / regen).
  useEffect(() => {
    if (!shortSyncKey || formatId !== "youtube_short") return;
    const pkg = packages.find((p) => p.formatId === "youtube_short");
    if (!pkg) return;
    setEditsByFormat((prev) => ({
      ...prev,
      youtube_short: editsFromPackage(pkg),
    }));
    setPromptModeState(shortHasDurableEdits(pkg) ? "manual" : "generated");
    setSelectedSceneId((prev) => prev ?? pkg.scenes[0]?.id ?? null);
  }, [shortSyncKey, formatId, packages]);

  // Video (and other formats): seed local edits without mode semantics.
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

  const dirty = useMemo(() => {
    if (!activePackage) return false;
    if (formatId === "youtube_short" && promptMode !== "manual") return false;
    const base = editsFromPackage(activePackage);
    return (
      edits.imagePrompt !== base.imagePrompt ||
      edits.voiceoverPrompt !== base.voiceoverPrompt ||
      edits.script !== base.script
    );
  }, [activePackage, edits, formatId, promptMode]);

  const setPromptMode = useCallback(
    (mode: StudioPromptMode) => {
      if (formatId !== "youtube_short" || !activePackage) return;
      if (mode === "generated") {
        setEditsByFormat((prev) => ({
          ...prev,
          youtube_short: editsFromPackage(activePackage),
        }));
        setSaveLabel("Save draft");
      } else {
        setEditsByFormat((prev) => ({
          ...prev,
          youtube_short: editsFromPackage(activePackage),
        }));
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
    setSaveLabel("Saving…");
    try {
      const res = await fetch("/api/brain/content/production", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          atomId: atomState.atom.atom_id,
          formatId: "youtube_short",
          edits,
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
      const pkg = data.bundle.packages.find((p) => p.formatId === "youtube_short");
      if (pkg) {
        setEditsByFormat((prev) => ({
          ...prev,
          youtube_short: editsFromPackage(pkg),
        }));
      }
      setPromptModeState("manual");
      setSaveLabel("Saved");
    } catch {
      setSaveLabel("Save failed");
    }
  }, [atomState, edits, formatId, promptMode]);

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
      const pkg = data.bundle.packages.find((p) => p.formatId === "youtube_short");
      if (pkg) {
        setEditsByFormat((prev) => ({
          ...prev,
          youtube_short: editsFromPackage(pkg),
        }));
      }
      setPromptModeState("generated");
      setSaveLabel("Save draft");
    } catch {
      setSaveLabel("Reset failed");
    }
  }, [activePackage, atomState, formatId]);

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
    dirty,
    saveLabel,
    saveEdits,
    resetEdits,
    regenerate,
    reloadAtom: () => (atomId ? loadAtom(atomId) : undefined),
  };
}

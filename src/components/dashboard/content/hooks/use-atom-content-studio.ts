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
} from "@/brain/content-studio";

type AtomLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; atom: ContentAtom; validation: AtomValidationReport | null; recordRevision: number; companyId: string; buildKey: string | null }
  | { status: "error"; error: string; statusCode?: number };

type BundleState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; bundle: ContentProductionBundle; warnings: string[]; loadedExisting: boolean }
  | { status: "error"; error: string };

type FormatEdits = {
  imagePrompt: string;
  voiceoverPrompt: string;
  script: string;
};

function editsFromPackage(pkg: ContentFormatPackage): FormatEdits {
  return {
    imagePrompt: pkg.imagePrompt,
    voiceoverPrompt: pkg.voiceoverPrompt,
    script: pkg.script,
  };
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
  const [saveLabel, setSaveLabel] = useState("Save draft");
  const requestRef = useRef(0);

  const loadAtom = useCallback(async (id: string) => {
    const requestId = ++requestRef.current;
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
      if (requestRef.current !== requestId) return;
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
      if (requestRef.current !== requestId) return;
      setAtomState({ status: "error", error: "Network error loading atom" });
    }
  }, []);

  const loadOrProduceBundle = useCallback(
    async (
      id: string,
      forceRegenerate = false,
      formatIds: ContentFormatId[] = ["youtube_short", "youtube_video"]
    ) => {
      setBundleState({ status: "loading" });
      try {
        if (!forceRegenerate) {
          const getRes = await fetch(
            `/api/brain/content/production?atomId=${encodeURIComponent(id)}`
          );
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
        // Clear stale client edits for regenerated formats so rail matches source.
        if (forceRegenerate) {
          setEditsByFormat((prev) => {
            const next = { ...prev };
            for (const fid of formatIds) {
              delete next[fid];
              try {
                sessionStorage.removeItem(`mm-format-edits:${id}:${fid}`);
              } catch {
                /* ignore */
              }
            }
            return next;
          });
        }
      } catch {
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

  const packages =
    bundleState.status === "ready" ? bundleState.bundle.packages : [];

  const activePackage =
    packages.find((p) => p.formatId === formatId) ?? null;

  useEffect(() => {
    if (!activePackage || atomState.status !== "ready") return;
    setEditsByFormat((prev) => {
      if (prev[formatId]) return prev;
      const key = `mm-format-edits:${atomState.atom.atom_id}:${formatId}`;
      try {
        const raw = sessionStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as FormatEdits;
          if (
            typeof parsed.imagePrompt === "string" &&
            typeof parsed.voiceoverPrompt === "string" &&
            typeof parsed.script === "string"
          ) {
            return { ...prev, [formatId]: parsed };
          }
        }
      } catch {
        /* ignore corrupt drafts */
      }
      return { ...prev, [formatId]: editsFromPackage(activePackage) };
    });
    setSelectedSceneId((prev) => prev ?? activePackage.scenes[0]?.id ?? null);
  }, [activePackage, atomState, formatId]);

  const edits =
    editsByFormat[formatId] ??
    (activePackage
      ? editsFromPackage(activePackage)
      : { imagePrompt: "", voiceoverPrompt: "", script: "" });

  const dirty = useMemo(() => {
    if (!activePackage) return false;
    const base = editsFromPackage(activePackage);
    return (
      edits.imagePrompt !== base.imagePrompt ||
      edits.voiceoverPrompt !== base.voiceoverPrompt ||
      edits.script !== base.script
    );
  }, [activePackage, edits]);

  const setEditField = useCallback(
    (field: keyof FormatEdits, value: string) => {
      setEditsByFormat((prev) => ({
        ...prev,
        [formatId]: {
          ...(prev[formatId] ?? {
            imagePrompt: "",
            voiceoverPrompt: "",
            script: "",
          }),
          [field]: value,
        },
      }));
      setSaveLabel("Unsaved changes");
    },
    [formatId]
  );

  const saveEdits = useCallback(() => {
    // Client-side draft persistence for the format (local to session).
    // Server package body stays the generated source of truth until a future save API.
    try {
      if (atomState.status === "ready") {
        const key = `mm-format-edits:${atomState.atom.atom_id}:${formatId}`;
        sessionStorage.setItem(key, JSON.stringify(edits));
      }
      setSaveLabel("Saved");
    } catch {
      setSaveLabel("Save failed");
    }
  }, [atomState, edits, formatId]);

  const resetEdits = useCallback(() => {
    if (!activePackage) return;
    setEditsByFormat((prev) => ({
      ...prev,
      [formatId]: editsFromPackage(activePackage),
    }));
    setSaveLabel("Save draft");
  }, [activePackage, formatId]);

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

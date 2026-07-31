import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type {
  ContentFormatId,
  ContentProductionBundle,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio";

import { seedShortEditors, type AtomFetchRecord, type BundleFetchRecord } from "./seed-short-editors";
import {
  fetchContentAtom,
  fetchExistingProductionBundle,
  produceProductionBundle,
  type FetchBundleResult,
} from "./studio-production-api";
import type {
  AtomLoadState,
  BundleState,
  FormatEdits,
  SceneEditFields,
  StudioPromptMode,
} from "./types";

type StudioBundleDeps = {
  trimmedAtomId: string | null;
  setEditsByFormat: Dispatch<
    SetStateAction<Partial<Record<ContentFormatId, FormatEdits>>>
  >;
  setSceneEditsById: Dispatch<
    SetStateAction<Record<string, SceneEditFields>>
  >;
  setPromptModeState: (mode: StudioPromptMode) => void;
  setSelectedSceneId: Dispatch<SetStateAction<string | null>>;
};

/**
 * Atom + production-bundle loading. Called only from useAtomContentStudio.
 */
export function useStudioBundle({
  trimmedAtomId,
  setEditsByFormat,
  setSceneEditsById,
  setPromptModeState,
  setSelectedSceneId,
}: StudioBundleDeps) {
  const [atomFetch, setAtomFetch] = useState<AtomFetchRecord | null>(null);
  const [bundleFetch, setBundleFetch] = useState<BundleFetchRecord | null>(null);
  const atomRequestRef = useRef(0);
  const bundleRequestRef = useRef(0);

  // Derive atom UI state from fetch record (idle/loading when atom id changes).
  const atomState: AtomLoadState = useMemo(() => {
    if (!trimmedAtomId) return { status: "idle" };
    if (!atomFetch || atomFetch.forAtomId !== trimmedAtomId) {
      return { status: "loading" };
    }
    const { result } = atomFetch;
    if (!result.ok) {
      return {
        status: "error",
        error: result.error,
        statusCode: result.statusCode,
      };
    }
    return {
      status: "ready",
      atom: result.atom,
      validation: result.validation,
      recordRevision: result.recordRevision,
      companyId: result.companyId,
      buildKey: result.buildKey,
    };
  }, [trimmedAtomId, atomFetch]);

  const atomReadyId =
    atomState.status === "ready" ? atomState.atom.atom_id : null;
  const atomIsLocked =
    atomState.status === "ready" &&
    atomState.atom.approvalStatus === "locked";

  // Derive bundle UI state from fetch record (idle/loading until locked atom ready).
  const bundleState: BundleState = useMemo(() => {
    if (!trimmedAtomId || !atomIsLocked || !atomReadyId) {
      return { status: "idle" };
    }
    if (!bundleFetch || bundleFetch.forAtomId !== atomReadyId) {
      return { status: "loading" };
    }
    const { result } = bundleFetch;
    if (!result.ok) {
      return { status: "error", error: result.error };
    }
    return {
      status: "ready",
      bundle: result.bundle,
      warnings: result.warnings,
      loadedExisting: result.loadedExisting,
    };
  }, [trimmedAtomId, atomIsLocked, atomReadyId, bundleFetch]);

  useEffect(() => {
    if (!trimmedAtomId) return;
    const requestId = ++atomRequestRef.current;
    void fetchContentAtom(trimmedAtomId).then((result) => {
      if (atomRequestRef.current !== requestId) return;
      setAtomFetch({ forAtomId: trimmedAtomId, requestId, result });
    });
  }, [trimmedAtomId]);

  const applyBundleResult = useCallback(
    (
      forAtomId: string,
      requestId: number,
      result: FetchBundleResult,
      preferredSceneId?: string | null
    ) => {
      if (bundleRequestRef.current !== requestId) return;
      setBundleFetch({ forAtomId, requestId, result });
      if (!result.ok) return;
      const short = result.bundle.packages.find(
        (p): p is YouTubeShortFormatPackage => p.formatId === "youtube_short"
      );
      if (short) {
        seedShortEditors(
          short,
          setEditsByFormat,
          setSceneEditsById,
          setPromptModeState,
          setSelectedSceneId,
          preferredSceneId
        );
      } else {
        setEditsByFormat({});
        setSceneEditsById({});
      }
    },
    [
      setEditsByFormat,
      setPromptModeState,
      setSceneEditsById,
      setSelectedSceneId,
    ]
  );

  /**
   * Event-path / shared resolver. Not called from Effects — Effects use a
   * .then chain so setState never runs synchronously in the effect body.
   */
  const resolveBundle = useCallback(
    async (
      id: string,
      forceRegenerate = false,
      formatIds: ContentFormatId[] = ["youtube_short", "youtube_video"],
      preferredSceneId?: string | null
    ) => {
      const requestId = ++bundleRequestRef.current;
      try {
        if (!forceRegenerate) {
          const existing = await fetchExistingProductionBundle(id);
          if (bundleRequestRef.current !== requestId) return;
          if (existing?.ok) {
            applyBundleResult(id, requestId, existing, preferredSceneId);
            return;
          }
        }

        const produced = await produceProductionBundle({
          atomId: id,
          forceRegenerate,
          formatIds,
        });
        if (bundleRequestRef.current !== requestId) return;
        applyBundleResult(id, requestId, produced, preferredSceneId);
      } catch {
        if (bundleRequestRef.current !== requestId) return;
        applyBundleResult(id, requestId, {
          ok: false,
          error: "Network error producing content",
        });
      }
    },
    [applyBundleResult]
  );

  useEffect(() => {
    if (!atomIsLocked || !atomReadyId) return;
    const id = atomReadyId;
    const requestId = ++bundleRequestRef.current;
    // Loading derived until this request resolves — setState only in .then.
    void fetchExistingProductionBundle(id)
      .then((existing) => {
        if (bundleRequestRef.current !== requestId) return null;
        if (existing?.ok) {
          applyBundleResult(id, requestId, existing);
          return null;
        }
        return produceProductionBundle({
          atomId: id,
          forceRegenerate: false,
          formatIds: ["youtube_short", "youtube_video"],
        });
      })
      .then((produced) => {
        if (produced == null) return;
        if (bundleRequestRef.current !== requestId) return;
        applyBundleResult(id, requestId, produced);
      })
      .catch(() => {
        if (bundleRequestRef.current !== requestId) return;
        applyBundleResult(id, requestId, {
          ok: false,
          error: "Network error producing content",
        });
      });
  }, [atomIsLocked, atomReadyId, applyBundleResult]);

  const applyReadyBundle = useCallback(
    (bundle: ContentProductionBundle, preferredSceneId?: string | null) => {
      const requestId = ++bundleRequestRef.current;
      applyBundleResult(
        bundle.atomId,
        requestId,
        {
          ok: true,
          bundle,
          warnings: [],
          loadedExisting: true,
        },
        preferredSceneId
      );
    },
    [applyBundleResult]
  );

  const regenerate = useCallback(
    (formatId: ContentFormatId, formatIds?: ContentFormatId[]) => {
      if (atomState.status !== "ready") return;
      setBundleFetch(null);
      void resolveBundle(
        atomState.atom.atom_id,
        true,
        formatIds ?? [formatId],
        null
      );
    },
    [atomState, resolveBundle]
  );

  const reloadAtom = useCallback(() => {
    if (!trimmedAtomId) return;
    const requestId = ++atomRequestRef.current;
    setAtomFetch(null);
    void fetchContentAtom(trimmedAtomId).then((result) => {
      if (atomRequestRef.current !== requestId) return;
      setAtomFetch({ forAtomId: trimmedAtomId, requestId, result });
    });
  }, [trimmedAtomId]);

  return {
    atomState,
    bundleState,
    applyReadyBundle,
    regenerate,
    reloadAtom,
  };
}

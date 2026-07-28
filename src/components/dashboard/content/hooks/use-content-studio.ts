"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { validateContentDirectionsHandoff } from "@/brain/content/handoff";
import type { ContentDirectionsHandoffV1 } from "@/brain/content/types";
import {
  loadContentDirectionsHandoff,
  loadContentDirectionsHandoffAsync,
  loadContentDirectionsIds,
} from "@/components/dashboard/marketing-topic/content-directions-storage";

import {
  loadContentDraft,
  saveContentDraft,
} from "../content-draft-storage";
import {
  CHANNEL_FORMATS,
  CONTENT_STUDIO_CHANNELS,
  defaultFormat,
  isStudioChannelEnabled,
  type ContentChannel,
  type ContentStudioChannel,
} from "../studio-channels";
import type {
  ContentAtom,
  ContentProductionApiResponse,
  ProductionPackage,
  StudioHandoffState,
} from "../types";

type UseContentStudioArgs = {
  domain: string | null;
};

const listeners = new Set<() => void>();
let cachedDomain: string | null = null;
let cachedRaw: string | null = null;
let cachedState: StudioHandoffState = { status: "loading" };

const SERVER_HANDOFF_SNAPSHOT: StudioHandoffState = { status: "loading" };

function isStudioChannel(value: string): value is ContentStudioChannel {
  return (CONTENT_STUDIO_CHANNELS as readonly string[]).includes(value);
}

const IDS_KEY_V3 = "mm-content-directions-ids-v3";
/**
 * Temporary: listen for pre-v3 keys until browsers finish one-time migrate.
 * REMOVE_BY: 2026-09-01 — stop listening/reading legacy keys; keep IDS_KEY_V3 only.
 * Keep in sync with content-directions-storage.ts migration removal.
 */
const LEGACY_HANDOFF_KEYS = [
  "mm-content-directions-ids-v2",
  "mm-content-directions-handoff-v1",
] as const;

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  if (typeof window !== "undefined") {
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === IDS_KEY_V3 ||
        (e.key &&
          (LEGACY_HANDOFF_KEYS as readonly string[]).includes(e.key))
      ) {
        cachedRaw = null;
        for (const listener of listeners) listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(onStoreChange);
      window.removeEventListener("storage", onStorage);
    };
  }
  return () => {
    listeners.delete(onStoreChange);
  };
}

function readHandoffState(domain: string | null): StudioHandoffState {
  if (!domain) return { status: "missing" };

  let raw: string | null = null;
  try {
    raw =
      localStorage.getItem(IDS_KEY_V3) ||
      localStorage.getItem(LEGACY_HANDOFF_KEYS[0]) ||
      localStorage.getItem(LEGACY_HANDOFF_KEYS[1]);
  } catch {
    raw = null;
  }

  if (cachedDomain === domain && cachedRaw === raw) {
    return cachedState;
  }

  cachedDomain = domain;
  cachedRaw = raw;

  const ids = loadContentDirectionsIds();
  if (ids && ids.domain === domain) {
    // Async hydrate fills this; avoid flashing invalid while session loads
    cachedState = { status: "loading" };
    return cachedState;
  }

  const loaded = loadContentDirectionsHandoff(domain);
  if (loaded) {
    cachedState = { status: "ready", handoff: loaded };
    return cachedState;
  }

  if (!raw) {
    cachedState = { status: "missing" };
    return cachedState;
  }

  // Only the legacy full-blob key can be parsed as a handoff document.
  try {
    const legacyBlob = localStorage.getItem(LEGACY_HANDOFF_KEYS[1]);
    if (!legacyBlob) {
      cachedState = { status: "missing" };
      return cachedState;
    }
    const validated = validateContentDirectionsHandoff(
      JSON.parse(legacyBlob),
      domain
    );
    cachedState = validated.ok
      ? { status: "ready", handoff: validated.handoff }
      : { status: "invalid", errors: validated.errors };
  } catch {
    cachedState = {
      status: "invalid",
      errors: ["Malformed handoff payload"],
    };
  }
  return cachedState;
}

function readDraftDefaults(domain: string | null): {
  channel: ContentStudioChannel;
  format: string;
  selectedAssetId: string | null;
  draftSavedAt: string | null;
} {
  void domain;
  const draft = loadContentDraft();
  if (draft && isStudioChannel(draft.channel)) {
    const formats = CHANNEL_FORMATS[draft.channel];
    const channel = isStudioChannelEnabled(draft.channel)
      ? draft.channel
      : "youtube_short";
    return {
      channel,
      format: (formats as readonly string[]).includes(draft.format)
        ? draft.format
        : defaultFormat(channel),
      selectedAssetId: draft.selectedAssetId,
      draftSavedAt: draft.savedAt,
    };
  }
  return {
    channel: "youtube_short",
    format: defaultFormat("youtube_short"),
    selectedAssetId: null,
    draftSavedAt: null,
  };
}

export function useContentStudio({ domain }: UseContentStudioArgs) {
  const getSnapshot = useCallback(
    () => readHandoffState(domain),
    [domain]
  );

  const handoffState = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => SERVER_HANDOFF_SNAPSHOT
  );

  useEffect(() => {
    if (!domain) return;
    let cancelled = false;
    void loadContentDirectionsHandoffAsync(domain).then((handoff) => {
      if (cancelled || !handoff) return;
      cachedDomain = domain;
      cachedRaw = "async";
      cachedState = { status: "ready", handoff };
      for (const listener of listeners) listener();
    });
    return () => {
      cancelled = true;
    };
  }, [domain]);

  const draftDefaults = useMemo(() => readDraftDefaults(domain), [domain]);

  const [atom, setAtom] = useState<ContentAtom | null>(null);
  const [packages, setPackages] = useState<ProductionPackage[]>([]);
  const [channel, setChannel] = useState<ContentStudioChannel>(
    draftDefaults.channel
  );
  const [format, setFormat] = useState<string>(draftDefaults.format);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(
    draftDefaults.selectedAssetId
  );
  const [assetSelectionByKey, setAssetSelectionByKey] = useState<
    Record<string, string>
  >({});
  const [loadingAtom, setLoadingAtom] = useState(false);
  const [updatingPackage, setUpdatingPackage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(
    draftDefaults.draftSavedAt
  );
  const [lastSuccessfulPreview, setLastSuccessfulPreview] =
    useState<ProductionPackage | null>(null);
  const inFlightRef = useRef(false);

  const formats = CHANNEL_FORMATS[channel];
  const channelEnabled = isStudioChannelEnabled(channel);

  const activePackage = useMemo(() => {
    if (!channelEnabled) return null;
    return (
      packages.find((p) => p.channel === channel && p.format === format) ??
      null
    );
  }, [packages, channel, format, channelEnabled]);

  const displayPackage = channelEnabled
    ? activePackage ?? lastSuccessfulPreview
    : null;

  const resolvedSelectedAssetId = useMemo(() => {
    const key = `${channel}:${format}`;
    if (assetSelectionByKey[key]) return assetSelectionByKey[key];
    if (
      selectedAssetId &&
      activePackage?.alternateAssets.some((a) => a.id === selectedAssetId)
    ) {
      return selectedAssetId;
    }
    return activePackage?.alternateAssets[0]?.id ?? null;
  }, [channel, format, assetSelectionByKey, selectedAssetId, activePackage]);

  const fetchProduction = useCallback(
    async (opts?: {
      channel?: ContentChannel;
      format?: string;
      regenerate?: boolean;
      handoff?: ContentDirectionsHandoffV1;
    }) => {
      const handoff =
        opts?.handoff ??
        (handoffState.status === "ready" ? handoffState.handoff : null);
      if (!handoff || !domain) return;

      const requestChannel = opts?.channel ?? channel;
      if (!isStudioChannelEnabled(requestChannel)) {
        setError("Adapter not connected yet");
        return;
      }

      if (inFlightRef.current) return;
      inFlightRef.current = true;

      const isInitial = !atom;
      if (isInitial) setLoadingAtom(true);
      else setUpdatingPackage(true);
      setError(null);

      try {
        const body: Record<string, unknown> = {
          handoff,
          generationId: handoff.generationId,
          domain,
          channel: requestChannel,
          format: opts?.format ?? format,
        };
        if (opts?.regenerate) {
          body.regeneratePackage = true;
        }

        const res = await fetch("/api/brain/content/production", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as ContentProductionApiResponse;
        if (!res.ok || !data.ok || !data.atom || !data.packages) {
          setError(data.error ?? "Could not prepare content production");
          return;
        }

        startTransition(() => {
          setAtom(data.atom!);

          if (opts?.regenerate && opts.channel && opts.format) {
            setPackages((prev) => {
              const next = prev.filter(
                (p) =>
                  !(p.channel === opts.channel && p.format === opts.format)
              );
              return [...next, ...data.packages!];
            });
          } else if (
            opts?.channel &&
            opts?.format &&
            data.packages!.length === 1
          ) {
            setPackages((prev) => {
              const next = prev.filter(
                (p) =>
                  !(p.channel === opts.channel && p.format === opts.format)
              );
              return [...next, ...data.packages!];
            });
          } else {
            setPackages(data.packages!);
          }

          const primary =
            data.packages!.find(
              (p) =>
                p.channel === (opts?.channel ?? channel) &&
                p.format === (opts?.format ?? format)
            ) ?? data.packages![0];
          if (primary) setLastSuccessfulPreview(primary);
        });
      } catch {
        setError("Network error while preparing content");
      } finally {
        inFlightRef.current = false;
        setLoadingAtom(false);
        setUpdatingPackage(false);
      }
    },
    [atom, channel, domain, format, handoffState]
  );

  function selectChannel(next: ContentStudioChannel) {
    setChannel(next);
    const nextFormats = CHANNEL_FORMATS[next];
    if (!(nextFormats as readonly string[]).includes(format)) {
      setFormat(defaultFormat(next));
    }
    if (!isStudioChannelEnabled(next)) {
      setError("Adapter not connected yet");
    } else {
      setError(null);
    }
  }

  function selectFormat(next: string) {
    if (!(formats as readonly string[]).includes(next)) return;
    setFormat(next);
  }

  function selectAsset(assetId: string) {
    setSelectedAssetId(assetId);
    setAssetSelectionByKey((prev) => ({
      ...prev,
      [`${channel}:${format}`]: assetId,
    }));
  }

  function saveDraft(): boolean {
    if (!atom || !activePackage) return false;
    const savedAt = new Date().toISOString();
    saveContentDraft({
      version: 1,
      atomId: atom.atom_id,
      channel,
      format,
      selectedAssetId: resolvedSelectedAssetId,
      packageVersion: activePackage.version,
      savedAt,
    });
    setDraftSavedAt(savedAt);
    return true;
  }

  async function generateNew() {
    if (!channelEnabled) {
      setError("Adapter not connected yet");
      return;
    }
    await fetchProduction({
      channel,
      format,
      regenerate: true,
    });
  }

  async function retry() {
    if (!channelEnabled) {
      setError("Adapter not connected yet");
      return;
    }
    if (!atom) {
      await fetchProduction({ channel, format });
    } else {
      await fetchProduction({ channel, format, regenerate: true });
    }
  }

  async function loadInitial() {
    if (handoffState.status !== "ready") return;
    await fetchProduction({
      handoff: handoffState.handoff,
      channel: "youtube_short",
      format: defaultFormat("youtube_short"),
    });
  }

  const packageValid = Boolean(
    activePackage?.validation.requiredFieldsPresent &&
      activePackage.validation.claimsCompliant &&
      activePackage.validation.readable
  );

  const selectedAsset =
    activePackage?.alternateAssets.find(
      (a) => a.id === resolvedSelectedAssetId
    ) ?? null;

  return {
    handoffState,
    atom,
    packages,
    channel,
    format,
    formats,
    channelEnabled,
    selectChannel,
    selectFormat,
    activePackage,
    displayPackage,
    selectedAssetId: resolvedSelectedAssetId,
    selectedAsset,
    selectAsset,
    loadingAtom,
    updatingPackage,
    error,
    retry,
    loadInitial,
    generateNew,
    saveDraft,
    draftSavedAt,
    packageValid,
    channels: CONTENT_STUDIO_CHANNELS,
  };
}

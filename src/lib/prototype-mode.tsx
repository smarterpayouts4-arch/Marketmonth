"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";

export type PrototypeMode = "first-run" | "completed";

type PrototypeModeContextValue = {
  mode: PrototypeMode;
  setMode: (mode: PrototypeMode) => void;
  isCompleted: boolean;
};

const STORAGE_KEY = "marketing-ai-prototype-mode";
const PrototypeModeContext = createContext<PrototypeModeContextValue | null>(
  null
);

const listeners = new Set<() => void>();
let hydrated = false;
let hydrateTimer: ReturnType<typeof setTimeout> | null = null;

function readStoredMode(): PrototypeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "completed" || stored === "first-run") return stored;
  } catch {
    // ignore
  }
  return "first-run";
}

function emitChange() {
  for (const listener of listeners) listener();
}

function ensureHydratedSchedule() {
  if (hydrated || hydrateTimer !== null) return;
  // Macrotask — runs after React hydration (which uses microtasks).
  hydrateTimer = setTimeout(() => {
    hydrateTimer = null;
    hydrated = true;
    emitChange();
  }, 0);
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  ensureHydratedSchedule();
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** During SSR + hydration always "first-run"; after macrotask, localStorage. */
function getSnapshot(): PrototypeMode {
  if (!hydrated) return "first-run";
  return readStoredMode();
}

function getServerSnapshot(): PrototypeMode {
  return "first-run";
}

export function PrototypeModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const mode = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const setMode = useCallback((next: PrototypeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    hydrated = true;
    emitChange();
  }, []);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      isCompleted: mode === "completed",
    }),
    [mode, setMode]
  );

  return (
    <PrototypeModeContext.Provider value={value}>
      {children}
    </PrototypeModeContext.Provider>
  );
}

export function usePrototypeMode() {
  const ctx = useContext(PrototypeModeContext);
  if (!ctx) {
    throw new Error("usePrototypeMode must be used within PrototypeModeProvider");
  }
  return ctx;
}

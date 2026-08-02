import type {
  ContentFormatId,
  ContentFormatPackage,
  ContentProductionBundle,
} from "@/brain/content-studio";

import type { RenderOp } from "../render-busy";
import type {
  AtomLoadState,
  FormatEdits,
  SceneEditFields,
  StudioPromptMode,
} from "../types";

export type StudioEditActionsDeps = {
  atomState: AtomLoadState;
  packages: ContentFormatPackage[];
  formatId: ContentFormatId;
  setFormatIdState: (id: ContentFormatId) => void;
  selectedSceneId: string | null;
  setSelectedSceneId: (
    value: string | null | ((prev: string | null) => string | null)
  ) => void;
  editsByFormat: Partial<Record<ContentFormatId, FormatEdits>>;
  setEditsByFormat: (
    updater: (
      prev: Partial<Record<ContentFormatId, FormatEdits>>
    ) => Partial<Record<ContentFormatId, FormatEdits>>
  ) => void;
  sceneEditsById: Record<string, SceneEditFields>;
  setSceneEditsById: (
    value:
      | Record<string, SceneEditFields>
      | ((prev: Record<string, SceneEditFields>) => Record<string, SceneEditFields>)
  ) => void;
  promptMode: StudioPromptMode;
  setPromptModeState: (mode: StudioPromptMode) => void;
  setSaveLabel: (label: string) => void;
  setIngestBusy: (busy: boolean) => void;
  setIngestError: (error: string | null) => void;
  setRenderBusy: (op: RenderOp, busy: boolean) => void;
  renderBusyMap: import("../render-busy").RenderBusyMap;
  setRenderMessage: (message: string | null) => void;
  setRenderError: (error: string | null) => void;
  applyReadyBundle: (
    bundle: ContentProductionBundle,
    preferredSceneId?: string | null
  ) => void;
};

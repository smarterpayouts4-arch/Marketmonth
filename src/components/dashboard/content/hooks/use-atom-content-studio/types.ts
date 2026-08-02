import type {
  AtomValidationReport,
  ContentAtom,
} from "@/brain/atom";
import type { ContentProductionBundle } from "@/brain/content-studio";

export type StudioPromptMode = "generated" | "manual";

export type SceneAssetType = "image" | "video";

export type SceneEditFields = {
  visualPrompt: string;
  narration: string;
  onScreenText: string;
  /** Durable Veo action instructions — used when assetType is video. */
  motionPrompt: string;
  assetType: SceneAssetType;
};

export type AtomLoadState =
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

export type BundleState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ready";
      bundle: ContentProductionBundle;
      warnings: string[];
      loadedExisting: boolean;
    }
  | { status: "error"; error: string };

/** Package-level durable-edit fields (Short Manual includes globalVisualStyle). */
export type FormatEdits = {
  imagePrompt: string;
  voiceoverPrompt: string;
  script: string;
  globalVisualStyle: string;
};

export const EMPTY_EDITS: FormatEdits = {
  imagePrompt: "",
  voiceoverPrompt: "",
  script: "",
  globalVisualStyle: "",
};

export const EMPTY_SCENE: SceneEditFields = {
  visualPrompt: "",
  narration: "",
  onScreenText: "",
  motionPrompt: "",
  assetType: "image",
};

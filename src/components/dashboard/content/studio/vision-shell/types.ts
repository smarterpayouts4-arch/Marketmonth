import type { AtomValidationReport, ContentAtom } from "@/brain/atom";
import type {
  ContentFormatId,
  ContentFormatPackage,
  ContentProductionBundle,
  PlatformId,
} from "@/brain/content-studio";

import type {
  SceneAssetType,
  SceneEditFields,
  StudioPromptMode,
} from "../../hooks/use-atom-content-studio";
import type { FullGenerateProgress } from "../../hooks/use-atom-content-studio/use-studio-edit-actions";

export type VisionShellProps = {
  atom: ContentAtom;
  validation: AtomValidationReport | null;
  recordRevision: number;
  bundle: ContentProductionBundle | null;
  bundleLoading: boolean;
  bundleError: string | null;
  warnings: string[];
  platform: PlatformId;
  onPlatformChange: (id: PlatformId) => void;
  formatId: ContentFormatId;
  onFormatChange: (id: ContentFormatId) => void;
  packages: ContentFormatPackage[];
  activePackage: ContentFormatPackage | null;
  selectedSceneId: string | null;
  onSelectScene: (id: string) => void;
  promptMode: StudioPromptMode;
  onPromptModeChange: (mode: StudioPromptMode) => void;
  sceneEdits: SceneEditFields;
  onSceneVisualPromptChange: (v: string) => void;
  onSceneNarrationChange: (v: string) => void;
  onSceneOnScreenTextChange: (v: string) => void;
  onSceneAssetTypeChange: (v: SceneAssetType) => void;
  onSceneMotionPromptChange: (v: string) => void;
  onResetScene: () => void | Promise<void>;
  onRemoveScene?: () => void | Promise<void>;
  onAddScene?: () => void | Promise<void>;
  globalVisualStyle?: string;
  onGlobalVisualStyleChange?: (v: string) => void;
  onPastePromptFill?: (prompt: string) => Promise<boolean>;
  onStartFromGenerated?: () => void;
  onValidateImageRender?: () => void | Promise<boolean>;
  onGenerateSceneVoice?: () => void | Promise<boolean>;
  onClearSceneVoice?: () => void | Promise<boolean>;
  onGenerateSceneVideo?: () => void | Promise<boolean>;
  onClearSceneVideo?: () => void | Promise<boolean>;
  onComposeSceneMp4?: () => void | Promise<boolean>;
  onGenerateCompleteScene?: () => void | Promise<boolean>;
  fullGenerateProgress?: FullGenerateProgress | null;
  ingestBusy?: boolean;
  ingestError?: string | null;
  renderBusy?: boolean;
  renderBusyMap?: import("../../hooks/use-atom-content-studio/render-busy").RenderBusyMap;
  renderMessage?: string | null;
  renderError?: string | null;
  imagePrompt: string;
  voiceoverPrompt: string;
  script: string;
  onImagePromptChange: (v: string) => void;
  onVoiceoverPromptChange: (v: string) => void;
  onScriptChange: (v: string) => void;
  dirty: boolean;
  saveLabel: string;
  onSave: () => void | Promise<void>;
  onReset: () => void | Promise<void>;
  onRegenerate: () => void;
  productionLocked: boolean;
  onAssembleFinalShort?: () => void | Promise<boolean>;
  assembleBusy?: boolean;
};

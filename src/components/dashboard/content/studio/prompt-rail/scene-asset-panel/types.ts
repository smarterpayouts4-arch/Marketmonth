import type {
  ContentFormatPackage,
} from "@/brain/content-studio";

import type {
  SceneAssetType,
  SceneEditFields,
} from "../../../hooks/use-atom-content-studio";
import type { RenderBusyMap } from "../../../hooks/use-atom-content-studio/render-busy";
import type { FullGenerateProgress } from "../../../hooks/use-atom-content-studio/use-studio-edit-actions";

export type SceneAssetPanelProps = {
  pkg: ContentFormatPackage;
  selectedSceneId: string;
  sceneEdits: SceneEditFields;
  fieldsReadOnly: boolean;
  dirty: boolean;
  /** @deprecated prefer renderBusyMap — true when any render op is busy */
  renderBusy?: boolean;
  renderBusyMap?: RenderBusyMap;
  renderMessage: string | null;
  renderError: string | null;
  saveLabel: string;
  onSave: () => void | Promise<void>;
  onReset: () => void | Promise<void>;
  onSceneAssetTypeChange: (v: SceneAssetType) => void;
  onSceneMotionPromptChange: (v: string) => void;
  onValidateImageRender?: () => void | Promise<boolean>;
  onGenerateSceneVoice?: () => void | Promise<boolean>;
  onClearSceneVoice?: () => void | Promise<boolean>;
  onGenerateSceneVideo?: () => void | Promise<boolean>;
  onClearSceneVideo?: () => void | Promise<boolean>;
  onComposeSceneMp4?: () => void | Promise<boolean>;
  onGenerateCompleteScene?: () => void | Promise<boolean>;
  fullGenerateProgress?: FullGenerateProgress | null;
};

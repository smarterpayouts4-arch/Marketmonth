"use client";

import type {
  ContentFormatId,
  ContentFormatPackage,
} from "@/brain/content-studio";

import type {
  SceneAssetType,
  SceneEditFields,
  StudioPromptMode,
} from "../../hooks/use-atom-content-studio";
import type { FullGenerateProgress } from "../../hooks/use-atom-content-studio/use-studio-edit-actions";
import { StudioPreviewCanvas } from "../preview-canvas";
import { StudioPromptRail } from "../prompt-rail";
import { StudioStoryboard } from "../storyboard";

type YoutubeWorkspaceProps = {
  formatId: ContentFormatId;
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
  onCopyExternalPrompt: () => void;
  promptCopied: boolean;
  bundleLoading: boolean;
};

export function YoutubeWorkspace({
  formatId,
  activePackage,
  selectedSceneId,
  onSelectScene,
  promptMode,
  onPromptModeChange,
  sceneEdits,
  onSceneVisualPromptChange,
  onSceneNarrationChange,
  onSceneOnScreenTextChange,
  onSceneAssetTypeChange,
  onSceneMotionPromptChange,
  onResetScene,
  onRemoveScene,
  onAddScene,
  globalVisualStyle,
  onGlobalVisualStyleChange,
  onPastePromptFill,
  onStartFromGenerated,
  onValidateImageRender,
  onGenerateSceneVoice,
  onClearSceneVoice,
  onGenerateSceneVideo,
  onClearSceneVideo,
  onComposeSceneMp4,
  onGenerateCompleteScene,
  fullGenerateProgress,
  ingestBusy,
  ingestError,
  renderBusy,
  renderBusyMap,
  renderMessage,
  renderError,
  imagePrompt,
  voiceoverPrompt,
  script,
  onImagePromptChange,
  onVoiceoverPromptChange,
  onScriptChange,
  dirty,
  saveLabel,
  onSave,
  onReset,
  onCopyExternalPrompt,
  promptCopied,
  bundleLoading,
}: YoutubeWorkspaceProps) {
  const isShort = formatId === "youtube_short";

  return (
    <div className="studio-workspace">
      <div className="studio-workspace__rail">
        <StudioPromptRail
          pkg={activePackage}
          promptMode={isShort ? promptMode : undefined}
          onPromptModeChange={isShort ? onPromptModeChange : undefined}
          selectedSceneId={isShort ? selectedSceneId : undefined}
          sceneEdits={isShort ? sceneEdits : undefined}
          onSceneVisualPromptChange={
            isShort ? onSceneVisualPromptChange : undefined
          }
          onSceneNarrationChange={isShort ? onSceneNarrationChange : undefined}
          onSceneOnScreenTextChange={
            isShort ? onSceneOnScreenTextChange : undefined
          }
          onSceneAssetTypeChange={isShort ? onSceneAssetTypeChange : undefined}
          onSceneMotionPromptChange={
            isShort ? onSceneMotionPromptChange : undefined
          }
          onResetScene={isShort ? onResetScene : undefined}
          globalVisualStyle={isShort ? globalVisualStyle : undefined}
          onGlobalVisualStyleChange={
            isShort ? onGlobalVisualStyleChange : undefined
          }
          onPastePromptFill={isShort ? onPastePromptFill : undefined}
          onStartFromGenerated={isShort ? onStartFromGenerated : undefined}
          onValidateImageRender={isShort ? onValidateImageRender : undefined}
          onGenerateSceneVoice={isShort ? onGenerateSceneVoice : undefined}
          onClearSceneVoice={isShort ? onClearSceneVoice : undefined}
          onGenerateSceneVideo={isShort ? onGenerateSceneVideo : undefined}
          onClearSceneVideo={isShort ? onClearSceneVideo : undefined}
          onComposeSceneMp4={isShort ? onComposeSceneMp4 : undefined}
          onGenerateCompleteScene={
            isShort ? onGenerateCompleteScene : undefined
          }
          fullGenerateProgress={isShort ? fullGenerateProgress : undefined}
          ingestBusy={isShort ? ingestBusy : undefined}
          ingestError={isShort ? ingestError : undefined}
          renderBusy={isShort ? renderBusy : undefined}
          renderBusyMap={isShort ? renderBusyMap : undefined}
          renderMessage={isShort ? renderMessage : undefined}
          renderError={isShort ? renderError : undefined}
          imagePrompt={imagePrompt}
          voiceoverPrompt={voiceoverPrompt}
          script={script}
          onImagePromptChange={onImagePromptChange}
          onVoiceoverPromptChange={onVoiceoverPromptChange}
          onScriptChange={onScriptChange}
          dirty={dirty}
          saveLabel={saveLabel}
          onSave={onSave}
          onReset={onReset}
          onCopyExternalPrompt={onCopyExternalPrompt}
          promptCopied={promptCopied}
        />
      </div>
      <div className="studio-workspace__stage">
        {bundleLoading && !activePackage ? (
          <div className="studio-preview-band items-center justify-center text-sm text-text-secondary">
            Building YouTube packages…
          </div>
        ) : (
          <StudioPreviewCanvas
            pkg={activePackage}
            selectedSceneId={selectedSceneId}
            sceneEdits={isShort ? sceneEdits : undefined}
            promptMode={isShort ? promptMode : undefined}
          />
        )}
        <StudioStoryboard
          pkg={activePackage}
          selectedSceneId={selectedSceneId}
          onSelectScene={onSelectScene}
          promptMode={isShort ? promptMode : undefined}
          onAddScene={isShort ? onAddScene : undefined}
          onRemoveSelectedScene={isShort ? onRemoveScene : undefined}
        />
      </div>
    </div>
  );
}

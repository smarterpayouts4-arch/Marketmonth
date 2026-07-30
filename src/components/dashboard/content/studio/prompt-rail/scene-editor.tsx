"use client";

import { ImageIcon, Mic, Type } from "lucide-react";

import type { ContentFormatPackage } from "@/brain/content-studio";

import type {
  SceneAssetType,
  SceneEditFields,
} from "../../hooks/use-atom-content-studio";
import { PromptCard } from "./prompt-card";

type SceneEditorProps = {
  pkg: ContentFormatPackage;
  selectedSceneId: string;
  sceneEdits: SceneEditFields;
  fieldsReadOnly: boolean;
  onSceneVisualPromptChange: (v: string) => void;
  onSceneNarrationChange: (v: string) => void;
  onSceneOnScreenTextChange: (v: string) => void;
  onSceneAssetTypeChange: (v: SceneAssetType) => void;
  onResetScene?: () => void | Promise<void>;
};

export function SceneEditor({
  pkg,
  selectedSceneId,
  sceneEdits,
  fieldsReadOnly,
  onSceneVisualPromptChange,
  onSceneNarrationChange,
  onSceneOnScreenTextChange,
  onSceneAssetTypeChange,
  onResetScene,
}: SceneEditorProps) {
  const selectedScene = pkg.scenes.find((s) => s.id === selectedSceneId);

  return (
    <div
      className="studio-prompt-card studio-prompt-card--compact"
      data-testid="studio-scene-editor"
      data-scene-id={selectedSceneId}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="studio-prompt-card__title">
          Scene {selectedScene ? selectedScene.order + 1 : "—"} ·{" "}
          {selectedSceneId}
        </p>
        {onResetScene ? (
          <button
            type="button"
            className="text-[10px] text-text-muted underline-offset-2 hover:underline"
            onClick={() => {
              void onResetScene();
            }}
            data-testid="studio-reset-scene"
          >
            Reset scene
          </button>
        ) : null}
      </div>
      <div className="mt-1.5 space-y-1.5 border-t border-border/50 pt-1.5">
        <PromptCard
          title="Scene visual prompt"
          icon={<ImageIcon className="h-3 w-3" aria-hidden />}
          value={sceneEdits.visualPrompt}
          onChange={onSceneVisualPromptChange}
          maxHint={800}
          copyTestId="studio-copy-scene-visual"
          readOnly={fieldsReadOnly}
          compact
        />
        <PromptCard
          title="Scene narration"
          icon={<Mic className="h-3 w-3" aria-hidden />}
          value={sceneEdits.narration}
          onChange={onSceneNarrationChange}
          maxHint={1200}
          copyTestId="studio-copy-scene-narration"
          readOnly={fieldsReadOnly}
          compact
        />
        <PromptCard
          title="On-screen text"
          icon={<Type className="h-3 w-3" aria-hidden />}
          value={sceneEdits.onScreenText}
          onChange={onSceneOnScreenTextChange}
          maxHint={160}
          copyTestId="studio-copy-scene-onscreen"
          readOnly={fieldsReadOnly}
          compact
        />
        <div
          className="flex items-center justify-between gap-2 text-xs"
          data-testid="studio-scene-asset-type"
        >
          <span className="text-text-muted">Asset type</span>
          <div className="studio-prompt-mode" role="group" aria-label="Asset type">
            <button
              type="button"
              className="studio-prompt-mode__btn"
              data-active={sceneEdits.assetType === "image" ? "true" : "false"}
              aria-pressed={sceneEdits.assetType === "image"}
              disabled={fieldsReadOnly}
              onClick={() => onSceneAssetTypeChange("image")}
              data-testid="studio-scene-asset-image"
            >
              Image
            </button>
            <button
              type="button"
              className="studio-prompt-mode__btn"
              data-active={sceneEdits.assetType === "video" ? "true" : "false"}
              aria-pressed={sceneEdits.assetType === "video"}
              disabled={fieldsReadOnly}
              onClick={() => onSceneAssetTypeChange("video")}
              data-testid="studio-scene-asset-video"
            >
              Video
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

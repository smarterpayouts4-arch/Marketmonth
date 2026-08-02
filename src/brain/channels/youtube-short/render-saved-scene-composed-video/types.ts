import type { ContentProductionBundle } from "@/brain/content-studio/schemas/format-package";
import type {
  ComposeSceneVideoRequest,
  ComposeSceneVideoResult,
  StoredVideoAsset,
} from "@/brain/render";

import type { SceneComposedVideoState } from "../scene-composed-video-state";

export type RenderSavedSceneComposedVideoInput = {
  atomId: string;
  sceneId: string;
  companyIdHint?: string;
  formatId?: string;
};

export type RenderSavedSceneComposedVideoDeps = {
  composeSceneVideo?: (
    request: ComposeSceneVideoRequest
  ) => Promise<ComposeSceneVideoResult>;
  uploadComposedVideo?: (input: {
    atomId: string;
    sceneId: string;
    bytes: Buffer;
    mimeType: string;
  }) => Promise<StoredVideoAsset>;
};

export type RenderSavedSceneComposedVideoResult =
  | {
      ok: true;
      status: number;
      atomId: string;
      sceneId: string;
      composedVideo: SceneComposedVideoState;
      bundle: ContentProductionBundle;
      message: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
      code: string;
      bundle?: ContentProductionBundle;
      composedVideo?: SceneComposedVideoState;
    };

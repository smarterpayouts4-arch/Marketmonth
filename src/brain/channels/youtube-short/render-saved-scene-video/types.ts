import type { ContentProductionBundle } from "@/brain/content-studio/schemas/format-package";
import type {
  GeneratedVideoMedia,
  StoredVideoAsset,
  VideoProviderConfig,
} from "@/brain/render";

import type { SceneVideoState } from "../scene-video-state";

export type RenderSavedSceneVideoInput = {
  atomId: string;
  sceneId: string;
  companyIdHint?: string;
  formatId?: string;
};

/** Test injection — production callers omit this. */
export type RenderSavedSceneVideoDeps = {
  generateVideo?: (
    input: {
      prompt: string;
      imageBytes: Buffer;
      imageMimeType: string;
    },
    providerConfig: VideoProviderConfig
  ) => Promise<GeneratedVideoMedia>;
  uploadSceneVideo?: (input: {
    atomId: string;
    sceneId: string;
    bytes: Buffer;
    mimeType: string;
  }) => Promise<StoredVideoAsset>;
  deleteSceneVideo?: (
    storageFileId: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  fetchStill?: (url: string) => Promise<{
    bytes: Buffer;
    mimeType: string;
  }>;
};

export type RenderSavedSceneVideoResult =
  | {
      ok: true;
      status: number;
      atomId: string;
      sceneId: string;
      video: SceneVideoState;
      bundle: ContentProductionBundle;
      message: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
      code: string;
      bundle?: ContentProductionBundle;
      video?: SceneVideoState;
    };

export type ClearSavedSceneVideoResult =
  | {
      ok: true;
      status: number;
      atomId: string;
      sceneId: string;
      bundle: ContentProductionBundle;
      message: string;
      storageDeleteAttempted: boolean;
      storageDeleteOk: boolean | null;
    }
  | {
      ok: false;
      status: number;
      error: string;
      code: string;
      bundle?: ContentProductionBundle;
    };

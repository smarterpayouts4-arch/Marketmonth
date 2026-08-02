import type { ContentProductionBundle } from "@/brain/content-studio/schemas/format-package";
import type {
  GeneratedVoiceMedia,
  StoredAudioAsset,
  VoiceProviderConfig,
} from "@/brain/render";

import type { SceneVoiceState } from "../scene-voice-state";

export type RenderSavedSceneVoiceInput = {
  atomId: string;
  sceneId: string;
  companyIdHint?: string;
  formatId?: string;
};

/** Test injection — production callers omit this. */
export type RenderSavedSceneVoiceDeps = {
  generateVoice?: (
    script: string,
    providerConfig: VoiceProviderConfig
  ) => Promise<GeneratedVoiceMedia>;
  uploadSceneVoice?: (input: {
    atomId: string;
    sceneId: string;
    bytes: Buffer;
    mimeType: string;
  }) => Promise<StoredAudioAsset>;
  deleteSceneVoice?: (
    storageFileId: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
};

export type RenderSavedSceneVoiceResult =
  | {
      ok: true;
      status: number;
      atomId: string;
      sceneId: string;
      voice: SceneVoiceState;
      bundle: ContentProductionBundle;
      message: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
      code: string;
      bundle?: ContentProductionBundle;
      voice?: SceneVoiceState;
    };

export type ClearSavedSceneVoiceResult =
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

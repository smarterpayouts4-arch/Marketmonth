import type { ContentAtom } from "@/brain/atom";
import type { AtomValidationReport } from "@/brain/atom/validate/types";
import type {
  ContentProductionBundle,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio/schemas/format-package";
import type {
  NormalizedRenderResult,
  RenderMediaAdapter,
} from "@/brain/render";

import type { ShortRenderErrorCode } from "../render-errors";
import type { SceneRenderState } from "../scene-render-state";
import type { ShortRenderInput } from "../short-render-input";
import type { YouTubeShortDraft } from "../youtube-short-draft";

export type RenderSavedSceneImageInput = {
  atomId: string;
  formatId?: "youtube_short";
  sceneId: string;
  companyIdHint?: string;
  /** Test injection — default adapter resolves from server config. */
  adapter?: RenderMediaAdapter;
};

export type RenderSavedSceneImageResult =
  | {
      ok: true;
      bundle: ContentProductionBundle;
      package: YouTubeShortFormatPackage;
      draft: YouTubeShortDraft;
      atom: ContentAtom;
      validationReport: AtomValidationReport | null;
      recordRevision: number;
      sceneId: string;
      render: SceneRenderState;
      shortRenderInput: ShortRenderInput;
      rendererResult: NormalizedRenderResult;
    }
  | {
      ok: false;
      error: string;
      code: ShortRenderErrorCode;
      status: number;
      bundle?: ContentProductionBundle;
      render?: SceneRenderState;
    };

import {
  ffmpegConcatSceneClips,
  uploadFinalShortToImageKit,
  runMediaPreflight,
} from "@/brain/render";

import type { PackageFinalShortState } from "../package-final-short-state";

export type AssembleFinalShortInput = {
  atomId: string;
  companyIdHint?: string;
};

export type AssembleFinalShortResult =
  | {
      ok: true;
      status: number;
      atomId: string;
      finalShort: PackageFinalShortState;
      bundle: import("@/brain/content-studio/schemas/format-package").ContentProductionBundle;
      message: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
      code: string;
      bundle?: import("@/brain/content-studio/schemas/format-package").ContentProductionBundle;
      finalShort?: PackageFinalShortState;
      readyScenes?: number;
      totalScenes?: number;
    };

export type AssembleFinalShortDeps = {
  concat?: typeof ffmpegConcatSceneClips;
  upload?: typeof uploadFinalShortToImageKit;
  preflight?: typeof runMediaPreflight;
};

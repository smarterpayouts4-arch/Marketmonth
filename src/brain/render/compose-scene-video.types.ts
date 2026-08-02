/** Provider-neutral one-scene composition request (channel → renderer). */

export type ComposeSceneVideoOutputSpec = {
  width: number;
  height: number;
  fps: number;
  format: "mp4";
};

export type ComposeSceneTitleOverlay = {
  titleLines: string[];
  supportingText: string | null;
  disclaimer: string | null;
  /**
   * Scene badge text. Renderer must ignore unless showSceneBadge is true.
   * Never hard-code "Scene 1" in the compositor.
   */
  sceneLabel?: string | null;
  /** Default false — omit badge from burned-in title. */
  showSceneBadge?: boolean;
  /** Optional accent token supplied by the channel (not renderer business logic). */
  accentWord?: string | null;
};

/** Channel-selected visual plate — still loop or Veo motion clip. */
export type ComposeSceneVisual = {
  kind: "still" | "motion";
  url: string;
};

export type ComposeSceneVideoRequest = {
  visual: ComposeSceneVisual;
  audioUrl: string;
  /** Timeline authority — must come from measured voice duration. */
  durationSeconds: number;
  output: ComposeSceneVideoOutputSpec;
  titleOverlay: ComposeSceneTitleOverlay;
};

export type ComposeSceneVideoResult =
  | {
      status: "generated";
      provider: string;
      compositor: string;
      bytes: Buffer;
      mimeType: string;
      width: number;
      height: number;
      /** Measured from output when available; else requested duration. */
      durationSeconds: number;
      durationVerified: boolean;
    }
  | {
      status: "stubbed";
      provider: string;
      compositor: string;
      asset_ref: string;
      width: number;
      height: number;
      durationSeconds: number;
    };

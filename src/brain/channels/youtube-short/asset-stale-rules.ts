export {
  applyAssetStaleRules,
  computeSceneStaleFlags,
  invalidateFinalShort,
  isAssetCurrent,
  isAssetStale,
  markDownstreamAfterComposeRegen,
  markDownstreamAfterMotionRegen,
  markDownstreamAfterStillRegen,
  markDownstreamAfterVoiceRegen,
} from "./asset-stale-rules/index";
export type { SceneStaleFlags } from "./asset-stale-rules/index";

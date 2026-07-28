/**
 * Internal modules for generateTopicCandidates.
 * Do not import from app code — use ../generate-topic-candidates as the sole public entry.
 */
export { frameCandidates, frameTitle } from "./frame-title";
export {
  applyTopicTitleHooks,
  TOPIC_TITLE_HOOK_VERSION,
} from "./topic-title-hook";
export { scoreCandidates, scoreCandidate } from "./score-candidate";
export { assembleCandidateResult, COMPLETE_COUNT } from "./assemble-result";
export { PREFERRED_KINDS, preferredKindBoost } from "./preferred-kinds";
export {
  groundedSupportKey,
  displayIntentKey,
  selectDistinctSupportKeys,
} from "./support-key";

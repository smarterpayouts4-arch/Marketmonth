/**
 * Thin facade for YouTube Short domain operations.
 * Implementation lives in concern modules; keep this file as the stable import surface.
 */

export {
  YOUTUBE_SHORT_SERVICE_VERSION,
  YOUTUBE_SHORT_TEMPLATE_VERSION,
  shortPackageHasPromptField,
} from "./service-versions";

export {
  applyDurableEditsToShortPackage,
  applyEffectiveFieldsToShortPackage,
  baselineFromPackage,
  mergeDurableEdits,
  resetShortPackageToGeneratedBaseline,
  resetShortSceneToGeneratedBaseline,
  resolveEffectiveScene,
} from "./durable-edits";

export {
  produceYouTubeShortFormatPackage,
  type ProduceShortFormatInput,
  type ProduceShortFormatResult,
} from "./produce-format-package";

export { validateShortFormatPackage } from "./validate-format-package";

export {
  patchYouTubeShortDurableEdits,
  type PatchShortEditsInput,
  type PatchShortEditsResult,
} from "./patch-durable-edits";

export {
  ingestYouTubeShortScenePrompt,
  setSceneIngestLlmAdapterForTests,
  type IngestScenePromptInput,
  type IngestScenePromptResult,
  type SceneIngestLlmAdapter,
} from "./ingest-scene-prompt";

export {
  addShortScene,
  applyShortSceneStructureAction,
  createEmptySceneCard,
  increaseShortSceneCount,
  newManualSceneId,
  removeShortScene,
} from "./scene-structure";

export { composeEffectiveImagePrompt } from "./compose-effective-image-prompt";

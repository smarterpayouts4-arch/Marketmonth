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

export {
  composeEffectiveImagePrompt,
  composeShortSceneEffectiveImagePrompt,
  hashEffectiveImagePrompt,
  hashSceneRenderSource,
  SHORT_IMAGE_PROMPT_EXCLUSIONS,
} from "./compose-effective-image-prompt";

export {
  renderYouTubeShortSavedSceneImage,
  getSceneRenderState,
  type RenderSavedSceneImageInput,
  type RenderSavedSceneImageResult,
} from "./render-saved-scene-image";

export {
  shortRenderInputSchema,
  shortRenderInputToGenericRequest,
  type ShortRenderInput,
} from "./short-render-input";

export {
  sceneRenderStateSchema,
  sceneRenderStatusSchema,
  type SceneRenderState,
  type SceneRenderStatus,
} from "./scene-render-state";

export {
  SHORT_RENDER_ERROR_CODES,
  SHORT_RENDER_ERROR_MESSAGES,
  httpStatusForShortRenderError,
  type ShortRenderErrorCode,
} from "./render-errors";

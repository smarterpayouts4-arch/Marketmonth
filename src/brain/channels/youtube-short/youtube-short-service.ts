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
  VISUAL_PROMPT_RESERVED_SECTION_HEADERS,
  visualPromptContainsReservedSectionHeaders,
  visualPromptReservedSectionHeaderError,
} from "./visual-prompt-section-headers";

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
  parseLabeledScenePrompt,
  pasteHasRecognizedSectionHeaders,
  validateLabeledScenePrompt,
  type LabeledSceneSectionId,
  type ParseLabeledScenePromptResult,
  type ValidateLabeledScenePromptResult,
} from "./parse-labeled-scene-prompt";

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
  clearYouTubeShortSavedSceneVoice,
  renderYouTubeShortSavedSceneVoice,
  type ClearSavedSceneVoiceResult,
  type RenderSavedSceneVoiceDeps,
  type RenderSavedSceneVoiceInput,
  type RenderSavedSceneVoiceResult,
} from "./render-saved-scene-voice/index";

export {
  clearYouTubeShortSavedSceneVideo,
  renderYouTubeShortSavedSceneVideo,
  type ClearSavedSceneVideoResult,
  type RenderSavedSceneVideoDeps,
  type RenderSavedSceneVideoInput,
  type RenderSavedSceneVideoResult,
} from "./render-saved-scene-video/index";

export {
  renderYouTubeShortSavedSceneComposedVideo,
  type RenderSavedSceneComposedVideoDeps,
  type RenderSavedSceneComposedVideoInput,
  type RenderSavedSceneComposedVideoResult,
} from "./render-saved-scene-composed-video/index";

export {
  assembleYouTubeShortFinal,
  type AssembleFinalShortDeps,
  type AssembleFinalShortInput,
  type AssembleFinalShortResult,
} from "./assemble-final-short";

export {
  applyAssetStaleRules,
  computeSceneStaleFlags,
  isAssetCurrent,
  isAssetStale,
} from "./asset-stale-rules";

export {
  packageFinalShortStateSchema,
  packageFinalShortStatusSchema,
  type PackageFinalShortState,
  type PackageFinalShortStatus,
} from "./package-final-short-state";

export {
  sceneVoiceStateSchema,
  sceneVoiceStatusSchema,
  type SceneVoiceState,
  type SceneVoiceStatus,
} from "./scene-voice-state";

export {
  sceneVideoStateSchema,
  sceneVideoStatusSchema,
  type SceneVideoState,
  type SceneVideoStatus,
} from "./scene-video-state";

export {
  sceneComposedVideoStateSchema,
  sceneComposedVideoStatusSchema,
  type SceneComposedVideoState,
  type SceneComposedVideoStatus,
} from "./scene-composed-video-state";

export {
  buildOnScreenTextLayout,
  splitOnScreenTextBlocks,
  type OnScreenTextLayout,
} from "./on-screen-text-layout";

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

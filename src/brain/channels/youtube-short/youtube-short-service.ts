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

/**
 * Pure helper for a future renderer bridge.
 * Phase 3D does not call providers — expose composition only.
 */
export function composeEffectiveImagePrompt(
  globalVisualStyle: string | undefined,
  sceneVisualPrompt: string
): string {
  const global = globalVisualStyle?.trim() ?? "";
  const scene = sceneVisualPrompt.trim();
  if (global && scene) return `${global}\n\n${scene}`;
  return global || scene;
}

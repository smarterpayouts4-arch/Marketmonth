/**
 * Reserved section labels that belong in structured fields / paste ingest,
 * not inside durable visualPrompt. Shared constants only — save rejects;
 * ingest extracts. No save-time auto-split.
 */
export const VISUAL_PROMPT_RESERVED_SECTION_HEADERS = [
  "NARRATION",
  "ON-SCREEN TEXT",
  "ON SCREEN TEXT",
  "ASSET TYPE",
  "MOTION PROMPT",
  "VIDEO PROMPT",
  "MOTION INSTRUCTIONS",
] as const;

/** Line-oriented section header (optional colon), case-insensitive. */
const RESERVED_SECTION_HEADER_RE =
  /(^|\n)\s*(NARRATION|ON[-\s]SCREEN\s+TEXT|ASSET\s+TYPE|MOTION\s+PROMPT|VIDEO\s+PROMPT|MOTION\s+INSTRUCTIONS)\s*:?\s*(\n|$)/i;

export function visualPromptContainsReservedSectionHeaders(
  visualPrompt: string
): boolean {
  return RESERVED_SECTION_HEADER_RE.test(visualPrompt);
}

/** Clear durable-save error, or null when clean. */
export function visualPromptReservedSectionHeaderError(
  visualPrompt: string,
  sceneId?: string
): string | null {
  if (!visualPromptContainsReservedSectionHeaders(visualPrompt)) {
    return null;
  }
  const where = sceneId ? `scene ${sceneId} ` : "";
  return (
    `${where}visualPrompt must not contain reserved section headers ` +
    `(NARRATION, ON-SCREEN TEXT, ASSET TYPE, MOTION PROMPT, VIDEO PROMPT, MOTION INSTRUCTIONS). ` +
    `Put those values in narration, onScreenText, assetType, and motionPrompt instead ` +
    `(or use paste ingest to extract them).`
  );
}

/** Service / adapter version stamp (shared with format package generation meta). */
export const YOUTUBE_SHORT_SERVICE_VERSION = "youtube-short-format-v1" as const;
export const YOUTUBE_SHORT_TEMPLATE_VERSION =
  "youtube-short-template-v1" as const;

const PROMPT_FIELDS = [
  "imagePrompt",
  "voiceoverPrompt",
  "script",
] as const;

export function shortPackageHasPromptField(
  field: string
): field is (typeof PROMPT_FIELDS)[number] {
  return (PROMPT_FIELDS as readonly string[]).includes(field);
}

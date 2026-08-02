/**
 * Single source of truth for Manual Short scene field size policy.
 * Imported by Zod schemas, ingest prompt text, paste gate, and Studio UI hints.
 *
 * Paste source must exceed visualPrompt so a full package (labels + narration +
 * OST + asset type + formatting) can still carry a max-length visual brief.
 */

/** Pasted unstructured scene package (Paste Prompt modal → ingest). */
export const SCENE_PASTE_PROMPT_MAX_CHARS = 16_000 as const;

/** Canonical scene visualPrompt (ingest extract, durable, draft, sceneCard). */
export const SCENE_VISUAL_PROMPT_MAX_CHARS = 8_000 as const;

/**
 * Durable Veo motion / action instructions (Asset Type = Video).
 * Cap matches visualPrompt — action + identity locks, not a second plate essay.
 */
export const SCENE_MOTION_PROMPT_MAX_CHARS = SCENE_VISUAL_PROMPT_MAX_CHARS;

/** Spoken narration for one scene. */
export const SCENE_NARRATION_MAX_CHARS = 1_200 as const;

/** On-screen text / caption overlay for one scene. */
export const SCENE_ON_SCREEN_TEXT_MAX_CHARS = 160 as const;

/**
 * Package-level Short imagePrompt (Visual metaphor) — intentionally separate
 * from scene visualPrompt. Do not raise with Phase 3F scene expansion.
 */
export const SHORT_PACKAGE_IMAGE_PROMPT_MAX_CHARS = 800 as const;

/**
 * Video chapter visualPrompt — intentionally unchanged by Phase 3F.
 * Kept here so tests can assert the chapter ceiling without drifting.
 */
export const VIDEO_CHAPTER_VISUAL_PROMPT_MAX_CHARS = 800 as const;

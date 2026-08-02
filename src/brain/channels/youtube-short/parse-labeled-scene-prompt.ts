/**
 * Deterministic labeled-header parser for Short Paste Prompt.
 * Pure: no LLM, no I/O. Labeled briefs never fall through silently.
 */

import {
  SCENE_MOTION_PROMPT_MAX_CHARS,
  SCENE_NARRATION_MAX_CHARS,
  SCENE_ON_SCREEN_TEXT_MAX_CHARS,
  SCENE_VISUAL_PROMPT_MAX_CHARS,
} from "./scene-field-limits";
import type { YouTubeShortSceneAssetType } from "./youtube-short-draft";

export type LabeledSceneSectionId =
  | "visualPrompt"
  | "narration"
  | "onScreenText"
  | "assetType"
  | "motionPrompt";

export type ParseLabeledScenePromptResult = {
  visualPrompt?: string;
  narration?: string;
  onScreenText?: string;
  assetType?: YouTubeShortSceneAssetType;
  /** Set when ASSET TYPE body is present but not image|video. */
  invalidAssetTypeRaw?: string;
  motionPrompt?: string;
  recognizedSections: LabeledSceneSectionId[];
  unknownSections: string[];
};

export type ValidateLabeledScenePromptResult =
  | {
      ok: true;
      fields: {
        visualPrompt: string;
        narration: string;
        onScreenText: string;
        assetType: YouTubeShortSceneAssetType;
        motionPrompt?: string;
      };
      recognizedSections: LabeledSceneSectionId[];
      unknownSections: string[];
    }
  | { ok: false; error: string };

/** True when paste contains at least one recognized field heading (not SCENE N alone). */
export function pasteHasRecognizedSectionHeaders(prompt: string): boolean {
  for (const line of normalizeNewlines(prompt).split("\n")) {
    if (matchFieldHeader(line)) return true;
  }
  return false;
}

/**
 * Split a labeled master brief into section bodies.
 * SCENE N is a document label only — its body is ignored.
 * Unknown labeled sections (e.g. OVERLAY DESIGN NOTES) are reported, never merged.
 */
export function parseLabeledScenePrompt(
  prompt: string
): ParseLabeledScenePromptResult {
  const lines = normalizeNewlines(prompt).split("\n");

  const bodies: Partial<Record<LabeledSceneSectionId, string[]>> = {};
  const recognized = new Set<LabeledSceneSectionId>();
  const unknownSections: string[] = [];

  type Active =
    | { kind: "field"; id: LabeledSceneSectionId }
    | { kind: "unknown"; label: string }
    | { kind: "ignore" }
    | null;

  let active: Active = null;

  for (const line of lines) {
    if (isSceneDocumentLabel(line)) {
      active = { kind: "ignore" };
      continue;
    }

    const fieldId = matchFieldHeader(line);
    if (fieldId) {
      active = { kind: "field", id: fieldId };
      recognized.add(fieldId);
      if (!bodies[fieldId]) bodies[fieldId] = [];
      continue;
    }

    const unknown = matchUnknownSectionHeader(line);
    if (unknown) {
      active = { kind: "unknown", label: unknown };
      if (!unknownSections.includes(unknown)) unknownSections.push(unknown);
      continue;
    }

    if (active?.kind === "field") {
      bodies[active.id]!.push(line);
    }
    // unknown / ignore / null: do not append into supported fields
  }

  const visualPrompt = finalizeBody(bodies.visualPrompt);
  const narration = finalizeBody(bodies.narration);
  const onScreenText = finalizeBody(bodies.onScreenText);
  const motionPrompt = finalizeBody(bodies.motionPrompt);
  const assetRaw = finalizeBody(bodies.assetType);

  let assetType: YouTubeShortSceneAssetType | undefined;
  let invalidAssetTypeRaw: string | undefined;
  if (assetRaw !== undefined) {
    const normalized = assetRaw.trim().toLowerCase();
    if (normalized === "image" || normalized === "video") {
      assetType = normalized;
    } else {
      invalidAssetTypeRaw = assetRaw;
    }
  }

  return {
    ...(visualPrompt !== undefined ? { visualPrompt } : {}),
    ...(narration !== undefined ? { narration } : {}),
    ...(onScreenText !== undefined ? { onScreenText } : {}),
    ...(assetType !== undefined ? { assetType } : {}),
    ...(invalidAssetTypeRaw !== undefined ? { invalidAssetTypeRaw } : {}),
    ...(motionPrompt !== undefined ? { motionPrompt } : {}),
    recognizedSections: [...recognized],
    unknownSections,
  };
}

/**
 * Validate a labeled parse for Manual draft application.
 * Fail closed when required labeled sections are missing/empty.
 */
export function validateLabeledScenePrompt(
  prompt: string
): ValidateLabeledScenePromptResult {
  const parsed = parseLabeledScenePrompt(prompt);
  const { recognizedSections, unknownSections } = parsed;

  if (recognizedSections.length === 0) {
    return { ok: false, error: "No recognized labeled sections found" };
  }

  if (recognizedSections.includes("onScreenText")) {
    const ost = parsed.onScreenText ?? "";
    if (!ost.trim()) {
      return {
        ok: false,
        error:
          "ON-SCREEN TEXT section is present but empty — provide title copy or remove the section",
      };
    }
  }

  if (parsed.invalidAssetTypeRaw !== undefined) {
    return {
      ok: false,
      error: `ASSET TYPE must be "image" or "video" (got ${JSON.stringify(
        parsed.invalidAssetTypeRaw.trim().slice(0, 40)
      )})`,
    };
  }

  const visualPrompt = parsed.visualPrompt?.trim() ?? "";
  const narration = parsed.narration?.trim() ?? "";
  const onScreenText = parsed.onScreenText ?? "";
  const assetType = parsed.assetType;

  if (!visualPrompt) {
    return {
      ok: false,
      error: "VISUAL PROMPT is required and must be non-empty",
    };
  }
  if (!narration) {
    return { ok: false, error: "NARRATION is required and must be non-empty" };
  }
  if (!onScreenText.trim()) {
    return {
      ok: false,
      error: "ON-SCREEN TEXT is required and must be non-empty",
    };
  }
  if (!assetType) {
    return {
      ok: false,
      error: 'ASSET TYPE is required and must be "image" or "video"',
    };
  }

  if (visualPrompt.length > SCENE_VISUAL_PROMPT_MAX_CHARS) {
    return {
      ok: false,
      error: `VISUAL PROMPT exceeds ${SCENE_VISUAL_PROMPT_MAX_CHARS} characters`,
    };
  }
  if (narration.length > SCENE_NARRATION_MAX_CHARS) {
    return {
      ok: false,
      error: `NARRATION exceeds ${SCENE_NARRATION_MAX_CHARS} characters`,
    };
  }
  if (onScreenText.length > SCENE_ON_SCREEN_TEXT_MAX_CHARS) {
    return {
      ok: false,
      error: `ON-SCREEN TEXT exceeds ${SCENE_ON_SCREEN_TEXT_MAX_CHARS} characters`,
    };
  }

  const motionRaw = parsed.motionPrompt;
  if (assetType === "video") {
    const motion = motionRaw?.trim() ?? "";
    if (!motion) {
      return {
        ok: false,
        error:
          "MOTION PROMPT is required when ASSET TYPE is video — describe shot action only",
      };
    }
    if (motion.length > SCENE_MOTION_PROMPT_MAX_CHARS) {
      return {
        ok: false,
        error: `MOTION PROMPT exceeds ${SCENE_MOTION_PROMPT_MAX_CHARS} characters`,
      };
    }
    return {
      ok: true,
      fields: {
        visualPrompt,
        narration,
        onScreenText,
        assetType,
        motionPrompt: motion,
      },
      recognizedSections,
      unknownSections,
    };
  }

  if (
    motionRaw !== undefined &&
    motionRaw.length > SCENE_MOTION_PROMPT_MAX_CHARS
  ) {
    return {
      ok: false,
      error: `MOTION PROMPT exceeds ${SCENE_MOTION_PROMPT_MAX_CHARS} characters`,
    };
  }

  return {
    ok: true,
    fields: {
      visualPrompt,
      narration,
      onScreenText,
      assetType,
      ...(motionRaw?.trim() ? { motionPrompt: motionRaw.trim() } : {}),
    },
    recognizedSections,
    unknownSections,
  };
}

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function trimOuter(text: string): string {
  return text.replace(/^\s+/, "").replace(/\s+$/, "");
}

function finalizeBody(lines: string[] | undefined): string | undefined {
  if (!lines) return undefined;
  return trimOuter(lines.join("\n"));
}

function headerCore(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/^(.+?)\s*:?\s*$/);
  if (!m?.[1]) return null;
  return m[1].replace(/\s+/g, " ").trim().toUpperCase();
}

function isSceneDocumentLabel(line: string): boolean {
  const core = headerCore(line);
  if (!core) return false;
  return /^SCENE\s+\d+$/.test(core);
}

function matchFieldHeader(line: string): LabeledSceneSectionId | null {
  const core = headerCore(line);
  if (!core) return null;

  if (core === "VISUAL PROMPT") return "visualPrompt";
  if (core === "NARRATION") return "narration";
  if (core === "ON-SCREEN TEXT" || core === "ON SCREEN TEXT") {
    return "onScreenText";
  }
  if (core === "ASSET TYPE") return "assetType";
  if (
    core === "MOTION PROMPT" ||
    core === "VIDEO PROMPT" ||
    core === "MOTION INSTRUCTIONS"
  ) {
    return "motionPrompt";
  }
  return null;
}

/** Explicit unsupported labeled sections — never contaminate supported fields. */
function matchUnknownSectionHeader(line: string): string | null {
  const core = headerCore(line);
  if (!core) return null;
  if (core === "OVERLAY DESIGN NOTES") return "OVERLAY DESIGN NOTES";
  return null;
}

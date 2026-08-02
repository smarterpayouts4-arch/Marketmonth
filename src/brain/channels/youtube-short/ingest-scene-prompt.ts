import {
  callBrainLlm,
  type BrainLlmTokenUsage,
} from "@/brain/llm/openai-client";
import { resolveModel } from "@/brain/policy/model-registry";
import { tokenBudget } from "@/brain/policy/token-budgets";
import { getContentBundle } from "@/brain/use-cases/produce-content-bundle";

import {
  pasteHasRecognizedSectionHeaders,
  validateLabeledScenePrompt,
} from "./parse-labeled-scene-prompt";
import {
  SCENE_NARRATION_MAX_CHARS,
  SCENE_ON_SCREEN_TEXT_MAX_CHARS,
  SCENE_PASTE_PROMPT_MAX_CHARS,
  SCENE_VISUAL_PROMPT_MAX_CHARS,
  YOUTUBE_SHORT_SCENE_INGEST_JSON_SCHEMA,
  youtubeShortSceneIngestExtractSchema,
  type YouTubeShortSceneIngestExtract,
} from "./youtube-short-draft";

export type IngestScenePromptInput = {
  atomId: string;
  companyIdHint: string;
  sceneId: string;
  prompt: string;
  /** Optional inject for tests — never used by UI. */
  apiKey?: string;
};

export type IngestScenePromptResult =
  | {
      ok: true;
      sceneId: string;
      extracted: YouTubeShortSceneIngestExtract;
      repairUsed: boolean;
      model: string;
      tokenUsage?: BrainLlmTokenUsage;
      unknownSections?: string[];
    }
  | {
      ok: false;
      status: number;
      error: string;
      model?: string;
    };

export type SceneIngestLlmCallArgs = {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  costScope?: { companyId: string };
};

export type SceneIngestLlmCallResult =
  | { ok: true; raw: string; tokenUsage?: BrainLlmTokenUsage }
  | { ok: false; reason: "timeout" | "api_error"; detail: string };

export type SceneIngestLlmAdapter = (
  args: SceneIngestLlmCallArgs
) => Promise<SceneIngestLlmCallResult>;

let adapterOverride: SceneIngestLlmAdapter | null = null;

/** Test seam: inject a fake LLM adapter (pass null to restore). */
export function setSceneIngestLlmAdapterForTests(
  adapter: SceneIngestLlmAdapter | null
): void {
  adapterOverride = adapter;
}

async function defaultSceneIngestLlm(
  args: SceneIngestLlmCallArgs
): Promise<SceneIngestLlmCallResult> {
  const result = await callBrainLlm({
    apiKey: args.apiKey,
    model: args.model,
    system: args.system,
    user: args.user,
    jsonSchema: YOUTUBE_SHORT_SCENE_INGEST_JSON_SCHEMA,
    maxOutputTokens: tokenBudget("shortSceneIngest"),
    costScope: args.costScope,
  });
  if (result.ok) {
    return { ok: true, raw: result.raw, tokenUsage: result.tokenUsage };
  }
  return { ok: false, reason: result.reason, detail: result.detail };
}

const SYSTEM_PROMPT = `You extract production fields for ONE YouTube Short scene (9:16).

Return ONLY JSON matching the schema with these keys:
- visualPrompt: clean still-image creation instructions only (subject, lighting, composition, wardrobe, environment). Never include spoken script, on-screen title copy, asset type, or motion/action instructions.
- narration: the exact spoken words for this scene only (not a multi-scene script). Do not rewrite or summarize.
- onScreenText: the exact designed on-screen title copy for this scene, preserving intended line breaks when present. Must not be empty when the brief includes title/overlay copy. Never put overlay design/styling notes here.
- assetType: "image" or "video" only. When the brief clearly asks for video/motion, use "video".
- motionPrompt: image-to-video action and continuity instructions only. Empty string when assetType is "image" and no motion is needed. Never merge motion into visualPrompt.

Rules:
- Stay faithful to the user's brief; do not invent brand claims.
- Keep visualPrompt ≤ ${SCENE_VISUAL_PROMPT_MAX_CHARS} chars, narration ≤ ${SCENE_NARRATION_MAX_CHARS} chars, onScreenText ≤ ${SCENE_ON_SCREEN_TEXT_MAX_CHARS} chars.
- Preserve detailed visual production language when present.
- Prefer concrete visual language suitable for later image generation.
- Never include section headers or bodies for NARRATION, ON-SCREEN TEXT, ASSET TYPE, or MOTION PROMPT inside visualPrompt.`;

function buildUserPrompt(prompt: string, sceneId: string): string {
  return `Scene id: ${sceneId}

Unstructured scene brief:
---
${prompt}
---

Extract visualPrompt, narration, onScreenText, assetType, and motionPrompt.`;
}

function buildRepairPrompt(
  prompt: string,
  sceneId: string,
  previousRaw: string,
  issue: string
): string {
  return `${buildUserPrompt(prompt, sceneId)}

Previous JSON was invalid:
${previousRaw.slice(0, 1200)}

Validation issue: ${issue}

Return corrected JSON only.`;
}

function parseExtract(
  raw: string
):
  | { ok: true; data: YouTubeShortSceneIngestExtract }
  | { ok: false; detail: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : "JSON parse failed",
    };
  }
  const result = youtubeShortSceneIngestExtractSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      detail: result.error.issues[0]?.message ?? "schema mismatch",
    };
  }
  return { ok: true, data: result.data };
}

function llmEmptyOstRejected(prompt: string, onScreenText: string): string | null {
  if (onScreenText.trim()) return null;
  // Unlabeled briefs that clearly carry title copy must not succeed with "".
  if (
    /educational\s+only/i.test(prompt) ||
    /especially\s+before\s+bed/i.test(prompt) ||
    /on[-\s]?screen\s+text/i.test(prompt)
  ) {
    return "onScreenText cannot be empty when the brief includes on-screen title copy";
  }
  return null;
}

/**
 * Extract scene fields from a pasted brief. Does NOT mutate the production
 * bundle — caller reviews and saves via PATCH durable edits.
 * Labeled headers → deterministic parser (no LLM). Unlabeled → LLM fallback.
 */
export async function ingestYouTubeShortScenePrompt(
  input: IngestScenePromptInput
): Promise<IngestScenePromptResult> {
  const atomId = input.atomId.trim();
  const sceneId = input.sceneId.trim();
  const prompt = input.prompt.trim();
  const model = resolveModel("shortScenePromptIngest");

  if (!atomId) {
    return { ok: false, status: 400, error: "atomId is required", model };
  }
  if (!sceneId) {
    return { ok: false, status: 400, error: "sceneId is required", model };
  }
  if (!prompt) {
    return { ok: false, status: 400, error: "prompt is required", model };
  }
  if (prompt.length > SCENE_PASTE_PROMPT_MAX_CHARS) {
    return {
      ok: false,
      status: 400,
      error: `prompt exceeds ${SCENE_PASTE_PROMPT_MAX_CHARS} characters`,
      model,
    };
  }

  const bundleOutcome = await getContentBundle({ atomId });
  if (!bundleOutcome.ok) {
    return {
      ok: false,
      status: bundleOutcome.status,
      error: bundleOutcome.error,
      model,
    };
  }

  const shortPkg = bundleOutcome.bundle.packages.find(
    (p) => p.formatId === "youtube_short"
  );
  if (!shortPkg) {
    return {
      ok: false,
      status: 404,
      error: "YouTube Short package not found for atom",
      model,
    };
  }
  if (!shortPkg.scenes.some((s) => s.id === sceneId)) {
    return {
      ok: false,
      status: 400,
      error: `Unknown sceneId: ${sceneId}`,
      model,
    };
  }

  if (pasteHasRecognizedSectionHeaders(prompt)) {
    const labeled = validateLabeledScenePrompt(prompt);
    if (!labeled.ok) {
      return { ok: false, status: 422, error: labeled.error, model };
    }
    const extracted: YouTubeShortSceneIngestExtract = {
      visualPrompt: labeled.fields.visualPrompt,
      narration: labeled.fields.narration,
      onScreenText: labeled.fields.onScreenText,
      assetType: labeled.fields.assetType,
      ...(labeled.fields.motionPrompt
        ? { motionPrompt: labeled.fields.motionPrompt }
        : {}),
      extractionMode: "deterministic",
    };
    return {
      ok: true,
      sceneId,
      extracted,
      repairUsed: false,
      model: "deterministic-labeled",
      unknownSections: labeled.unknownSections,
    };
  }

  const apiKey = input.apiKey ?? process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      error: "OPENAI_API_KEY is not configured",
      model,
    };
  }

  const callLlm = adapterOverride ?? defaultSceneIngestLlm;
  const costScope = { companyId: input.companyIdHint };

  const first = await callLlm({
    apiKey,
    model,
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(prompt, sceneId),
    costScope,
  });
  if (!first.ok) {
    return {
      ok: false,
      status: first.reason === "timeout" ? 504 : 502,
      error: `Scene prompt extraction failed: ${first.detail}`,
      model,
    };
  }

  const firstParsed = parseExtract(first.raw);
  if (firstParsed.ok) {
    const ostErr = llmEmptyOstRejected(prompt, firstParsed.data.onScreenText);
    if (ostErr) {
      return { ok: false, status: 422, error: ostErr, model };
    }
    if (
      firstParsed.data.assetType === "video" &&
      !(firstParsed.data.motionPrompt ?? "").trim()
    ) {
      return {
        ok: false,
        status: 422,
        error: "motionPrompt is required when assetType is video",
        model,
      };
    }
    return {
      ok: true,
      sceneId,
      extracted: { ...firstParsed.data, extractionMode: "llm" },
      repairUsed: false,
      model,
      tokenUsage: first.tokenUsage,
    };
  }

  const repair = await callLlm({
    apiKey,
    model,
    system: SYSTEM_PROMPT,
    user: buildRepairPrompt(prompt, sceneId, first.raw, firstParsed.detail),
    costScope,
  });
  if (!repair.ok) {
    return {
      ok: false,
      status: repair.reason === "timeout" ? 504 : 502,
      error: `Scene prompt extraction failed after repair: ${repair.detail}`,
      model,
    };
  }

  const repaired = parseExtract(repair.raw);
  if (!repaired.ok) {
    return {
      ok: false,
      status: 422,
      error: `Could not extract valid scene fields: ${repaired.detail}`,
      model,
    };
  }

  const ostErr = llmEmptyOstRejected(prompt, repaired.data.onScreenText);
  if (ostErr) {
    return { ok: false, status: 422, error: ostErr, model };
  }
  if (
    repaired.data.assetType === "video" &&
    !(repaired.data.motionPrompt ?? "").trim()
  ) {
    return {
      ok: false,
      status: 422,
      error: "motionPrompt is required when assetType is video",
      model,
    };
  }

  return {
    ok: true,
    sceneId,
    extracted: { ...repaired.data, extractionMode: "llm" },
    repairUsed: true,
    model,
    tokenUsage: repair.tokenUsage,
  };
}

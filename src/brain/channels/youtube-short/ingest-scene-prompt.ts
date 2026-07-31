import {
  callBrainLlm,
  type BrainLlmTokenUsage,
} from "@/brain/llm/openai-client";
import { resolveModel } from "@/brain/policy/model-registry";
import { tokenBudget } from "@/brain/policy/token-budgets";
import { getContentBundle } from "@/brain/use-cases/produce-content-bundle";

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
- visualPrompt: one image/video generation brief. Fold mood, lighting, composition, color, subject, style, background, and camera notes into this single string. Do NOT invent separate mood/lighting fields.
- narration: spoken line for this scene only (not a full multi-scene script).
- onScreenText: short caption/text overlay for this scene (may be empty string).
- assetType: "image" or "video" based on the brief (default "image" if unclear).

Rules:
- Stay faithful to the user's brief; do not invent brand claims.
- Keep visualPrompt ≤ ${SCENE_VISUAL_PROMPT_MAX_CHARS} chars, narration ≤ ${SCENE_NARRATION_MAX_CHARS} chars, onScreenText ≤ ${SCENE_ON_SCREEN_TEXT_MAX_CHARS} chars.
- Preserve detailed visual production language when present — do not compress or omit sections just to shorten the string when under the visualPrompt limit.
- Prefer concrete visual language suitable for later image generation.`;

function buildUserPrompt(prompt: string, sceneId: string): string {
  return `Scene id: ${sceneId}

Unstructured scene brief:
---
${prompt}
---

Extract visualPrompt, narration, onScreenText, and assetType.`;
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

/**
 * Extract scene fields from a pasted brief. Does NOT mutate the production
 * bundle — caller reviews and saves via PATCH durable edits.
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
    return {
      ok: true,
      sceneId,
      extracted: firstParsed.data,
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

  return {
    ok: true,
    sceneId,
    extracted: repaired.data,
    repairUsed: true,
    model,
    tokenUsage: repair.tokenUsage,
  };
}

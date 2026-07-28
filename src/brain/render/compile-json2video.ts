import type { Json2VideoPayload } from "./types";
import type { ScenePlan } from "./scene-plan.types";

function resolutionForFormat(format: ScenePlan["format"]): string {
  if (format === "youtube_short") {
    return "1080x1920";
  }
  return "1080x1080";
}

function textPosition(safeZone: string): string {
  if (safeZone === "lower_third") return "bottom-center";
  if (safeZone === "center") return "center-center";
  return "top-center";
}

/**
 * Deterministic compiler: Scene Plan → JSON2Video-shaped payload.
 * AI never invents the API-native shape.
 */
export function compileScenePlanToJson2Video(input: {
  scenePlan: ScenePlan;
  packageId: string;
  atomId: string;
  coverImageRef?: string;
  voiceAssetRef?: string;
}): Json2VideoPayload {
  const { scenePlan } = input;
  const scenes = scenePlan.scenes.map((scene, index) => ({
    duration: scene.duration_seconds,
    comment: `scene_${index + 1}: ${scene.motion}`,
    elements: [
      ...(input.coverImageRef && index === 0
        ? [
            {
              type: "image" as const,
              src: input.coverImageRef,
              duration: scene.duration_seconds,
            },
          ]
        : [
            {
              type: "shape" as const,
              text: scene.visual,
              duration: scene.duration_seconds,
            },
          ]),
      {
        type: "text" as const,
        text: scene.on_screen_text ?? "",
        position: textPosition(scene.safe_zone ?? "center"),
        duration: scene.duration_seconds,
      },
      ...(input.voiceAssetRef && index === 0
        ? [
            {
              type: "voice" as const,
              src: input.voiceAssetRef,
            },
          ]
        : []),
    ],
  }));

  return {
    template: "mm_scene_plan_v1",
    project: {
      id: `j2v_${input.packageId}`,
      resolution: resolutionForFormat(scenePlan.format),
      scenes,
    },
    meta: {
      package_id: input.packageId,
      atom_id: input.atomId,
      compiled_at: new Date().toISOString(),
    },
  };
}

/** Optional live submit — MVP returns payload only unless JSON2VIDEO_API_KEY set. */
export async function submitJson2VideoPayload(
  payload: Json2VideoPayload
): Promise<{ status: "queued" | "dry_run"; job_id?: string }> {
  if (!process.env.JSON2VIDEO_API_KEY) {
    return { status: "dry_run" };
  }
  // Live HTTP integration reserved; keep dry-run safe by default.
  return { status: "dry_run", job_id: payload.project.id };
}

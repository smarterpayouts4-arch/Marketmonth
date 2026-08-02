import type { ContentProductionBundle } from "@/brain/content-studio";

export type AssembleFinalShortClientResult =
  | {
      ok: true;
      bundle: ContentProductionBundle;
      message: string;
    }
  | {
      ok: false;
      error: string;
      bundle?: ContentProductionBundle;
      readyScenes?: number;
      totalScenes?: number;
    };

export async function assembleFinalShortRequest(input: {
  atomId: string;
}): Promise<AssembleFinalShortClientResult> {
  const res = await fetch(
    "/api/brain/content/production/assemble-final-short",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        atomId: input.atomId,
        formatId: "youtube_short",
      }),
    }
  );
  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    bundle?: ContentProductionBundle;
    message?: string;
    readyScenes?: number;
    totalScenes?: number;
  };
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error: data.error ?? "Could not assemble final Short",
      bundle: data.bundle,
      readyScenes: data.readyScenes,
      totalScenes: data.totalScenes,
    };
  }
  if (!data.bundle) {
    return { ok: false, error: "Could not assemble final Short" };
  }
  return {
    ok: true,
    bundle: data.bundle,
    message: data.message ?? "Final Short assembled",
  };
}

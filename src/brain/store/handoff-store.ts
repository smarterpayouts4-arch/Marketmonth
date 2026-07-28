import type { ContentDirectionsHandoffV1 } from "@/brain/content/types";

import { readJsonFile, writeJsonAtomic } from "./json-store";
import { handoffPath } from "./paths";

export async function saveHandoffRecord(
  handoff: ContentDirectionsHandoffV1
): Promise<void> {
  await writeJsonAtomic(handoffPath(handoff.generationId), {
    kind: "handoff",
    savedAt: new Date().toISOString(),
    handoff,
  });
}

export function loadHandoffRecord(
  generationId: string
): ContentDirectionsHandoffV1 | null {
  const row = readJsonFile<{ handoff: ContentDirectionsHandoffV1 }>(
    handoffPath(generationId)
  );
  return row?.handoff ?? null;
}

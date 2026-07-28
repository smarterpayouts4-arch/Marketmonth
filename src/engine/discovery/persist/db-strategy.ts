import { getDb } from "../../../db";
import { strategyPreviews } from "../../../db/schema";
import type { StrategyPreview } from "../brand-profile";
import type { PersistedStrategy } from "./types";

export async function persistStrategy(input: {
  brandProfileId: string;
  strategyPreview: StrategyPreview;
}): Promise<PersistedStrategy> {
  const db = getDb();
  const [row] = await db
    .insert(strategyPreviews)
    .values({
      brandProfileId: input.brandProfileId,
      preview: input.strategyPreview,
    })
    .returning();

  return {
    strategyPreviewId: row.id,
    strategyPreview: input.strategyPreview,
  };
}

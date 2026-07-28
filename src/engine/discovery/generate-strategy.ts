import { userConfirmedFromIntent } from "@/lib/discovery/evidence";
import type { DiscoveryEvidence } from "@/lib/discovery/evidence.schema";

import { brandProfileSchema, strategyIntentSchema } from "./brand-profile";
import { buildStrategyWithIntent } from "./build-strategy";
import {
  getBrandProfileById,
  memoryGetEvidence,
  memoryPersistStrategy,
  persistStrategy,
} from "./persist";

export async function generateStrategyForIntent(input: {
  brandProfileId?: string;
  brandProfile?: unknown;
  goal: string;
  promoteFirst: string;
  reach: string;
  targetLocation?: string;
  growthDirection?: string;
  growthThesis?: string;
  buyerTension?: string;
  brandCoreEdit?: string;
}) {
  const intent = strategyIntentSchema.parse({
    goal: input.goal,
    promoteFirst: input.promoteFirst,
    reach: input.reach,
    targetLocation:
      input.reach === "local" && input.targetLocation?.trim()
        ? input.targetLocation.trim()
        : undefined,
    growthDirection: input.growthDirection,
    growthThesis: input.growthThesis?.trim() || undefined,
    buyerTension: input.buyerTension?.trim() || undefined,
    brandCoreEdit: input.brandCoreEdit?.trim() || undefined,
  });

  let brandProfileId = input.brandProfileId;
  let brandProfile = input.brandProfile
    ? brandProfileSchema.parse(input.brandProfile)
    : null;
  let evidence: DiscoveryEvidence[] = [];
  let pageCount = 0;

  if (brandProfileId) {
    const row = await getBrandProfileById(brandProfileId);
    if (row) {
      brandProfile = row.profile;
      brandProfileId = row.id;
      evidence = row.evidence;
      pageCount = row.pageCount;
    } else {
      const mem = memoryGetEvidence(brandProfileId);
      if (mem) {
        evidence = mem.evidence;
        pageCount = mem.pageCount;
      }
    }
  }

  if (!brandProfile && brandProfileId) {
    const mem = memoryGetEvidence(brandProfileId);
    if (mem) {
      evidence = mem.evidence;
      pageCount = mem.pageCount;
    }
  }

  if (!brandProfile) {
    throw new Error("Brand profile is required to build a strategy");
  }

  if (!evidence.length && brandProfileId) {
    const mem = memoryGetEvidence(brandProfileId);
    if (mem) {
      evidence = mem.evidence;
      pageCount = mem.pageCount || pageCount;
    }
  }

  const confirmed = userConfirmedFromIntent(intent);
  const allEvidence = [...evidence, ...confirmed];

  // Never re-crawl: strategy uses stored profile + evidence + intent only.
  const strategyPreview = await buildStrategyWithIntent({
    brandProfile,
    intent,
    evidence: allEvidence,
  });

  if (brandProfileId && process.env.DATABASE_URL) {
    try {
      const saved = await persistStrategy({
        brandProfileId,
        strategyPreview,
      });
      return {
        brandProfileId,
        brandProfile,
        pageCount,
        evidence: allEvidence,
        ...saved,
      };
    } catch {
      /* fall through to memory */
    }
  }

  return {
    brandProfileId: brandProfileId ?? crypto.randomUUID(),
    brandProfile,
    pageCount,
    evidence: allEvidence,
    ...memoryPersistStrategy({ strategyPreview }),
  };
}

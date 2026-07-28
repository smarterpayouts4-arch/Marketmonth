import {
  validateContentDirectionsHandoff,
} from "@/brain/content/handoff";
import type { ContentDirectionsHandoffV1 } from "@/brain/content/types";

const ID_KEY = "mm-content-directions-ids-v3";
/**
 * Temporary one-time migration reader (client only).
 * Reads v2 once → writes v3 with generationId → deletes v2.
 * Not an API/domain alias for decisionSetId.
 *
 * REMOVE_BY: 2026-09-01 — delete LEGACY_ID_KEY_V2, LEGACY_KEY, migrateV2Ids(),
 * and sync legacy-blob loadContentDirectionsHandoff fallback.
 */
const LEGACY_ID_KEY_V2 = "mm-content-directions-ids-v2";
/** Temporary: legacy full-blob key — sync fallback only; cleared on save. REMOVE_BY: 2026-09-01 */
const LEGACY_KEY = "mm-content-directions-handoff-v1";

export type ContentDirectionsIdsV3 = {
  version: 3;
  domain: string;
  generationId: string;
  selectedVariationId: string;
};

export function saveContentDirectionsHandoff(
  handoff: ContentDirectionsHandoffV1
): void {
  const ids: ContentDirectionsIdsV3 = {
    version: 3,
    domain: handoff.brand.domain,
    generationId: handoff.generationId,
    selectedVariationId: handoff.selectedVariationId,
  };
  try {
    localStorage.setItem(ID_KEY, JSON.stringify(ids));
    localStorage.removeItem(LEGACY_ID_KEY_V2);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // private mode / quota
  }

  void fetch("/api/brain/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ handoff, domain: handoff.brand.domain }),
  }).catch(() => {
    // offline / store unavailable — IDs still local
  });
}

export function loadContentDirectionsIds(): ContentDirectionsIdsV3 | null {
  try {
    const raw = localStorage.getItem(ID_KEY);
    if (!raw) return migrateV2Ids();
    const parsed = JSON.parse(raw) as ContentDirectionsIdsV3;
    if (
      parsed?.version !== 3 ||
      !parsed.domain ||
      !parsed.generationId ||
      !parsed.selectedVariationId
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function migrateV2Ids(): ContentDirectionsIdsV3 | null {
  try {
    const raw = localStorage.getItem(LEGACY_ID_KEY_V2);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      version?: number;
      domain?: string;
      decisionSetId?: string;
      selectedVariationId?: string;
    };
    if (
      !parsed.domain ||
      !parsed.decisionSetId ||
      !parsed.selectedVariationId
    ) {
      return null;
    }
    const next: ContentDirectionsIdsV3 = {
      version: 3,
      domain: parsed.domain,
      generationId: parsed.decisionSetId,
      selectedVariationId: parsed.selectedVariationId,
    };
    localStorage.setItem(ID_KEY, JSON.stringify(next));
    localStorage.removeItem(LEGACY_ID_KEY_V2);
    return next;
  } catch {
    return null;
  }
}

/** Sync load — legacy blob only. Prefer loadContentDirectionsHandoffAsync. */
export function loadContentDirectionsHandoff(
  expectedDomain?: string
): ContentDirectionsHandoffV1 | null {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return null;
    const parsed = JSON.parse(legacy) as unknown;
    const validated = validateContentDirectionsHandoff(parsed, expectedDomain);
    return validated.ok ? validated.handoff : null;
  } catch {
    return null;
  }
}

export async function loadContentDirectionsHandoffAsync(
  expectedDomain?: string
): Promise<ContentDirectionsHandoffV1 | null> {
  const ids = loadContentDirectionsIds();
  if (ids) {
    if (expectedDomain && ids.domain !== expectedDomain) return null;
    try {
      const res = await fetch(
        `/api/brain/session?generationId=${encodeURIComponent(ids.generationId)}&domain=${encodeURIComponent(ids.domain)}`
      );
      if (res.ok) {
        const data = (await res.json()) as {
          ok?: boolean;
          handoff?: ContentDirectionsHandoffV1;
        };
        if (data.ok && data.handoff) {
          const validated = validateContentDirectionsHandoff(
            data.handoff,
            expectedDomain
          );
          if (validated.ok) return validated.handoff;
        }
      }
    } catch {
      // fall through
    }
  }
  return loadContentDirectionsHandoff(expectedDomain);
}

export function clearContentDirectionsHandoff(): void {
  try {
    localStorage.removeItem(ID_KEY);
    localStorage.removeItem(LEGACY_ID_KEY_V2);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // ignore
  }
}

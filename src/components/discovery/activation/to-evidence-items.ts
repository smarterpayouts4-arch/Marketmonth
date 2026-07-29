/**
 * Presentation adapter for the Discovery card's evidence rows.
 * The derivation itself lives in `@/lib/discovery/card-copy` so the engine's
 * display-copy polish can start from the same deterministic output.
 */
import type { SocialDiscoveryProfile } from "@/lib/discovery/discovery-narrative.schema";
import { toCardRows } from "@/lib/discovery/card-copy";

import type { DiscoveryEvidenceItem } from "./types";

export { conciseSummary, sourceLabelFromUrl } from "@/lib/discovery/card-copy";

export function toEvidenceItems(
  section: SocialDiscoveryProfile["sections"][number]
): DiscoveryEvidenceItem[] {
  return toCardRows(section);
}

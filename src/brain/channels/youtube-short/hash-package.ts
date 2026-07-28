import { stableHash } from "@/brain/atom";

import type { YouTubeShortPackage } from "./package.schema";

export function computeYouTubeShortPackageHash(
  pkg: Omit<YouTubeShortPackage, "package_hash">
): string {
  const raw = JSON.stringify({
    channel: pkg.channel,
    source_atom_id: pkg.source_atom_id,
    source_atom_version: pkg.source_atom_version,
    strategy_lock: pkg.strategy_lock,
    title: pkg.title,
    spoken_hook: pkg.spoken_hook,
    script: pkg.script,
    retention_plan: pkg.retention_plan,
    thumbnail_or_first_frame: pkg.thumbnail_or_first_frame,
    scenes: pkg.scenes,
    voice_direction: pkg.voice_direction,
    render_plan: pkg.render_plan,
    claim_ids_used: pkg.claim_ids_used,
    proof_ids_used: pkg.proof_ids_used,
  });
  return `ph_${stableHash(raw)}`;
}

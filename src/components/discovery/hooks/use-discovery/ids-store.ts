import type { DiscoveryIds } from "@/components/discovery/types";

const STORAGE_KEY = "marketing-ai-discovery-ids";

export function persistIds(ids: DiscoveryIds) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

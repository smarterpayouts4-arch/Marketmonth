import { defaultDryRunAdapter } from "./adapters/dry-run-adapter";
import { createLiveImageAdapter } from "./adapters/live-image-adapter";
import { resolveImageProviderConfig } from "./config/image-provider-config";
import type { RenderMediaAdapter } from "./contracts";

/**
 * Select dry-run vs live adapter from server-only configuration.
 */
export function resolveDefaultRenderAdapter(): RenderMediaAdapter {
  const config = resolveImageProviderConfig();
  if (config.mode === "live" && config.missing.length === 0) {
    return createLiveImageAdapter();
  }
  return defaultDryRunAdapter;
}

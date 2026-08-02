import { resolveImageProviderConfig } from "@/brain/render/config/image-provider-config";
import type { RenderMediaAdapter } from "@/brain/render";

export function expectedRenderMode(
  adapter: RenderMediaAdapter | undefined
): "dry_run" | "live" {
  if (adapter) {
    return adapter.id.includes("live") ? "live" : "dry_run";
  }
  return resolveImageProviderConfig().mode;
}

export function expectedProvider(adapter: RenderMediaAdapter | undefined): string {
  if (adapter) {
    return adapter.id.includes("live") ? "gemini" : "dry-run";
  }
  const config = resolveImageProviderConfig();
  return config.mode === "live" ? config.provider : "dry-run";
}

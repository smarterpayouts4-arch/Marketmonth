import { saveProductionBundle } from "@/brain/content-studio/bundle-store";
import type {
  ContentProductionBundle,
  YouTubeShortFormatPackage,
} from "@/brain/content-studio/schemas/format-package";

/** Replace the Short package in the bundle and persist atomically. */
export async function persistShortPackage(
  bundle: ContentProductionBundle,
  shortPkg: YouTubeShortFormatPackage
): Promise<ContentProductionBundle> {
  const next: ContentProductionBundle = {
    ...bundle,
    packages: bundle.packages.map((p) =>
      p.formatId === "youtube_short" ? shortPkg : p
    ),
    updatedAt: new Date().toISOString(),
  };
  await saveProductionBundle(next);
  return next;
}

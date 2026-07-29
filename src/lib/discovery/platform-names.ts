/**
 * Canonical display names for social platforms.
 * Shared by the engine and the Discovery UI, which may not import from
 * `src/engine/discovery/`. Naive capitalization produced "Linkedin",
 * "Youtube", and "Tiktok" in four separate places.
 */
const DISPLAY_NAMES: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X",
  pinterest: "Pinterest",
  threads: "Threads",
  reddit: "Reddit",
};

export function platformDisplayName(platform: string): string {
  const key = platform.trim().toLowerCase();
  return (
    DISPLAY_NAMES[key] ??
    (key ? key.charAt(0).toUpperCase() + key.slice(1) : platform)
  );
}

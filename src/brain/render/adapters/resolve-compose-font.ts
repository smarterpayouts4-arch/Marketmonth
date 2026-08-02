import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

export type ResolvedComposeFont = {
  /** ASS Fontname */
  family: string;
  /**
   * Relative fonts directory for FFmpeg `subtitles=…:fontsdir=…`
   * (relative to the compose workdir — avoids Windows drive-colon escaping).
   */
  fontsDirRelative: string | null;
};

type FontCandidate = {
  family: string;
  /** Absolute paths to try (Bold preferred). */
  files: string[];
};

function windowsFontCandidates(): FontCandidate[] {
  const root = path.join("C:", "Windows", "Fonts");
  return [
    {
      family: "Segoe UI",
      files: [
        path.join(root, "segoeuib.ttf"),
        path.join(root, "seguisb.ttf"),
        path.join(root, "segoeui.ttf"),
      ],
    },
    {
      family: "Arial",
      files: [
        path.join(root, "arialbd.ttf"),
        path.join(root, "arial.ttf"),
      ],
    },
  ];
}

function linuxFontCandidates(): FontCandidate[] {
  return [
    {
      family: "DejaVu Sans",
      files: [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      ],
    },
    {
      family: "Arial",
      files: [
        "/usr/share/fonts/truetype/msttcorefonts/Arial_Bold.ttf",
        "/usr/share/fonts/truetype/msttcorefonts/Arial.ttf",
      ],
    },
  ];
}

/**
 * Stage a server-safe bold sans into the compose workdir and return ASS Fontname.
 *
 * DOM preview uses Bricolage Grotesque (next/font) — not bundled for FFmpeg.
 * Closest deterministic faces: Segoe UI → Arial → DejaVu Sans.
 * Override with MM_COMPOSE_FONT_FILE (+ optional MM_COMPOSE_FONT_FAMILY).
 */
export function stageComposeFont(workRoot: string): ResolvedComposeFont {
  const stagedDir = path.join(workRoot, "fonts");
  mkdirSync(stagedDir, { recursive: true });

  const envFile = process.env.MM_COMPOSE_FONT_FILE?.trim();
  const envFamily = process.env.MM_COMPOSE_FONT_FAMILY?.trim();
  if (envFile && existsSync(envFile)) {
    const dest = path.join(stagedDir, path.basename(envFile));
    copyFileSync(envFile, dest);
    return {
      family: envFamily || "ComposeSans",
      fontsDirRelative: "fonts",
    };
  }

  const candidates = [
    ...windowsFontCandidates(),
    ...linuxFontCandidates(),
  ];

  for (const candidate of candidates) {
    for (const file of candidate.files) {
      if (!existsSync(file)) continue;
      const dest = path.join(stagedDir, path.basename(file));
      copyFileSync(file, dest);
      return {
        family: envFamily || candidate.family,
        fontsDirRelative: "fonts",
      };
    }
  }

  // No local file staged — ASS still names Arial; libass/fontconfig may resolve.
  return {
    family: envFamily || "Arial",
    fontsDirRelative: null,
  };
}

/** @deprecated Prefer stageComposeFont — kept for tests that only need a family name. */
export function resolveComposeFontFamily(): string {
  const fromEnv = process.env.MM_COMPOSE_FONT_FAMILY?.trim();
  if (fromEnv) return fromEnv;
  for (const candidate of [
    ...windowsFontCandidates(),
    ...linuxFontCandidates(),
  ]) {
    if (candidate.files.some((f) => existsSync(f))) return candidate.family;
  }
  return "Arial";
}

export function resolveComposeFontsDir(): string | null {
  const fromEnv = process.env.MM_COMPOSE_FONT_DIR?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  return null;
}

/** Escape a fontsdir path for an FFmpeg filtergraph argument (relative paths preferred). */
export function escapeFfmpegFontsDir(dir: string): string {
  return dir.replace(/\\/g, "/").replace(/:/g, "\\:");
}

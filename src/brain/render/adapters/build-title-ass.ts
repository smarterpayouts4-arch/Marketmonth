import type { ComposeSceneTitleOverlay } from "../compose-scene-video.types";

import { resolveComposeFontFamily } from "./resolve-compose-font";

/** Escape ASS dialogue text. */
export function escapeAss(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\n/g, "\\N");
}

export function formatAssTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const whole = Math.floor(sec);
  const cs = Math.round((sec - whole) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(whole).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function accentTitleBody(
  titleRaw: string,
  accentWord: string | undefined,
  primary: string,
  accent: string
): string {
  if (!titleRaw) return "";
  if (!accentWord) return escapeAss(titleRaw);
  const re = new RegExp(
    `(${accentWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi"
  );
  const parts = titleRaw.split(re);
  return parts
    .map((part) =>
      part.toLowerCase() === accentWord.toLowerCase()
        ? `{\\c${accent}&}${escapeAss(part)}{\\c${primary}&}`
        : escapeAss(part)
    )
    .join("");
}

/**
 * ASS overlay aligned to Studio DOM preview direction (left stack, bottom disclaimer).
 * PlayRes matches output (typically 1080×1920).
 *
 * Font: resolveComposeFontFamily() — DOM uses Bricolage Grotesque; compositor uses
 * the closest server-safe face (Segoe UI / DejaVu / Arial). Not pixel-identical.
 */
export function buildTitleAssOverlay(input: {
  overlay: ComposeSceneTitleOverlay;
  durationSeconds: number;
  width: number;
  height: number;
  fontFamily?: string;
}): string {
  const { overlay, durationSeconds, width, height } = input;
  const end = formatAssTime(durationSeconds);
  const font = input.fontFamily ?? resolveComposeFontFamily();

  // Match globals.css overlay tokens (ASS uses &HAABBGGRR).
  const primary = "&H00F4F8FA"; // #FAF8F4 off-white
  const accent = "&H006EAB9A"; // #9AAB6E olive/sage
  const dim = "&H00B8E0EB"; // muted warm disclaimer

  const marginL = Math.round(width * 0.06);
  const marginR = Math.round(width * 0.36); // ≈58% max title column
  const titleTop = Math.round(height * 0.07);
  const titleFont = Math.round(height * 0.053); // ~102 @ 1920
  const supportFont = Math.round(height * 0.036); // ~69 @ 1920
  const disclaimerFont = Math.round(height * 0.018); // ~35 @ 1920
  const titleLines = overlay.titleLines.filter((l) => l.trim().length > 0);
  const lineCount = Math.max(1, titleLines.length);
  const supportTop =
    titleTop +
    Math.round(lineCount * titleFont * 1.08) +
    Math.round(height * 0.028);
  const disclaimerBottom = Math.round(height * 0.12);

  const titleRaw = titleLines.join("\n").trim();
  const titleBody = accentTitleBody(
    titleRaw,
    overlay.accentWord?.trim() || undefined,
    primary,
    accent
  );

  const showBadge =
    overlay.showSceneBadge === true && Boolean(overlay.sceneLabel?.trim());

  const dialogue: string[] = [];
  if (showBadge) {
    dialogue.push(
      `Dialogue: 0,0:00:00.00,${end},Badge,,${marginL},${marginR},${Math.round(height * 0.045)},,${escapeAss(overlay.sceneLabel!.trim())}`
    );
  }
  if (titleBody) {
    dialogue.push(
      `Dialogue: 0,0:00:00.00,${end},Title,,${marginL},${marginR},${titleTop},,${titleBody}`
    );
  }
  if (overlay.supportingText?.trim()) {
    // Sage rule (DOM border-top) then upright support copy — not italic.
    const supportBody = `{\\c${accent}&}{\\fsp2}────────{\\r}\\N{\\c${primary}&}${escapeAss(overlay.supportingText.trim())}`;
    dialogue.push(
      `Dialogue: 0,0:00:00.00,${end},Support,,${marginL},${marginR},${supportTop},,${supportBody}`
    );
  }
  if (overlay.disclaimer?.trim()) {
    dialogue.push(
      `Dialogue: 0,0:00:00.00,${end},Disclaimer,,${Math.round(width * 0.08)},${Math.round(width * 0.08)},${disclaimerBottom},,${escapeAss(overlay.disclaimer.trim())}`
    );
  }

  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    "WrapStyle: 2",
    "ScaledBorderAndShadow: yes",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    // Alignment 7 = top-left; 2 = bottom-center. Outline/shadow ≈ DOM text-shadow.
    `Style: Badge,${font},36,${primary},&H000000FF,&H64000000,${accent},1,0,0,0,100,100,0,0,3,0,0,7,${marginL},${marginR},${Math.round(height * 0.045)},1`,
    `Style: Title,${font},${titleFont},${primary},&H000000FF,&H64000000,&H00000000,1,0,0,0,100,100,-2,0,1,3,2,7,${marginL},${marginR},${titleTop},1`,
    `Style: Support,${font},${supportFont},${primary},&H000000FF,&H64000000,&H00000000,0,0,0,0,100,100,0,0,1,2,1,7,${marginL},${marginR},${supportTop},1`,
    `Style: Disclaimer,${font},${disclaimerFont},${dim},&H000000FF,&H64000000,&H00000000,0,0,0,0,100,100,0,0,1,2,1,2,${Math.round(width * 0.08)},${Math.round(width * 0.08)},${disclaimerBottom},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...dialogue,
    "",
  ].join("\n");
}

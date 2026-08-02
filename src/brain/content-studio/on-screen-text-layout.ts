/**
 * Client-safe title-layout interpretation for Short scene composition + Studio DOM.
 * Pure parsing only — no React/CSS/FFmpeg.
 */

const DISCLAIMER_LINE_RE = /educational\s+only/i;
const SUPPORT_TAIL_RE =
  /(?:^|\s)(Especially\s+before\s+bed\.?)\s*$/i;

export type OnScreenTextLayout = {
  title: string;
  /** Title split on explicit newlines for ASS / overlay parity. */
  titleLines: string[];
  support: string | null;
  disclaimer: string | null;
  /** Optional accent token already identified by UI heuristics (not renderer logic). */
  accentWord: string | null;
  /**
   * Scene badge label. Empty unless durable layout explicitly enables the badge.
   * Never auto-fill "Scene N" for composition.
   */
  sceneLabel: string;
  /** Default false — DOM preview and MP4 omit the badge unless opted in. */
  showSceneBadge: boolean;
};

function peelDisclaimerAndSupport(text: string): {
  title: string;
  support: string | null;
  disclaimer: string | null;
} {
  let rest = text.trim();
  let disclaimer: string | null = null;
  let support: string | null = null;

  const disclaimerMatch = rest.match(
    /(?:^|[\n.]\s*)(Educational\s+only[^\n]*)$/i
  );
  if (disclaimerMatch?.[1] && DISCLAIMER_LINE_RE.test(disclaimerMatch[1])) {
    disclaimer = disclaimerMatch[1].trim();
    rest = rest.slice(0, disclaimerMatch.index).replace(/[\s.]+$/, "").trimEnd();
    if (rest && !/[?!.]$/.test(rest) && /attention$/i.test(rest)) {
      rest = `${rest}?`;
    }
  }

  if (SUPPORT_TAIL_RE.test(rest.replace(/\s+/g, " ").trim())) {
    support = "Especially before bed.";
    rest = rest.replace(/\s*Especially\s+before\s+bed\.?\s*$/i, "").trimEnd();
  }

  return {
    title: rest.trim(),
    support,
    disclaimer,
  };
}

/** Blank-line blocks → title / optional supporting / optional disclaimer. */
export function splitOnScreenTextBlocks(raw: string): {
  title: string;
  support: string | null;
  disclaimer: string | null;
} {
  const parts = raw
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { title: "", support: null, disclaimer: null };
  }

  if (parts.length >= 2) {
    const title = parts[0]!;
    let support: string | null = parts[1] ?? null;
    let disclaimer: string | null = parts[2] ?? null;

    if (!disclaimer && support && DISCLAIMER_LINE_RE.test(support)) {
      disclaimer = support;
      support = null;
    }
    if (
      !disclaimer &&
      parts.length >= 3 &&
      DISCLAIMER_LINE_RE.test(parts[parts.length - 1]!)
    ) {
      disclaimer = parts[parts.length - 1]!;
      support = parts.length === 3 ? parts[1]! : parts.slice(1, -1).join("\n\n");
    }

    if (!disclaimer || !support) {
      const peeled = peelDisclaimerAndSupport(
        [title, support, disclaimer].filter(Boolean).join("\n\n")
      );
      return {
        title: peeled.title || title,
        support: peeled.support ?? support,
        disclaimer: peeled.disclaimer ?? disclaimer,
      };
    }

    if (support && /especially\s+before\s+bed/i.test(support.replace(/\s+/g, " "))) {
      support = "Especially before bed.";
    }

    return { title, support, disclaimer };
  }

  return peelDisclaimerAndSupport(parts[0]!);
}

/**
 * Build composition title overlay from durable onScreenText.
 * Accent word is only passed when the UI heuristic already highlights it.
 */
export function buildOnScreenTextLayout(input: {
  onScreenText: string;
  sceneOrder: number;
  /** Opt-in only. Default false — do not burn "Scene N" into the MP4. */
  showSceneBadge?: boolean;
  /** Optional explicit badge text when showSceneBadge is true. */
  sceneLabel?: string | null;
}): OnScreenTextLayout {
  const blocks = splitOnScreenTextBlocks(input.onScreenText ?? "");
  const accentMatch = blocks.title.match(/\b(magnesium)\b/i);
  const showSceneBadge = input.showSceneBadge === true;
  const explicitLabel = input.sceneLabel?.trim() ?? "";
  return {
    title: blocks.title,
    titleLines: blocks.title
      ? blocks.title.split("\n").map((l) => l.trimEnd())
      : [],
    support: blocks.support,
    disclaimer: blocks.disclaimer,
    accentWord: accentMatch?.[1] ?? null,
    showSceneBadge,
    sceneLabel: showSceneBadge
      ? explicitLabel || `Scene ${input.sceneOrder + 1}`
      : "",
  };
}

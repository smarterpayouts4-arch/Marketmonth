export function stripDashes(text: string): string {
  return text
    .replace(/\u2014/g, ", ")
    .replace(/\u2013/g, ", ")
    .replace(/\s*,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}

/** Legacy hard clamp — prefer truncateAtSentence for body copy. */
export function clamp(text: string, max: number): string {
  const cleaned = stripDashes(text);
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Sentence-aware truncation for landing previews.
 * Never cuts mid-word; prefers `.` `?` `!` boundaries before falling back to whole words.
 */
export function truncateAtSentence(
  text: string,
  maxCharacters: number
): { text: string; wasTruncated: boolean } {
  const full = stripDashes(text);
  if (!full) return { text: "", wasTruncated: false };
  if (full.length <= maxCharacters) {
    return { text: full, wasTruncated: false };
  }

  const window = full.slice(0, maxCharacters);
  const sentenceEnd = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("? "),
    window.lastIndexOf("! "),
    window.endsWith(".") || window.endsWith("?") || window.endsWith("!")
      ? window.length - 1
      : -1
  );

  if (sentenceEnd >= Math.floor(maxCharacters * 0.45)) {
    const end =
      window[sentenceEnd] === " "
        ? sentenceEnd
        : sentenceEnd + 1;
    return {
      text: `${full.slice(0, end).trimEnd()}…`,
      wasTruncated: true,
    };
  }

  const wordEnd = window.lastIndexOf(" ");
  if (wordEnd >= Math.floor(maxCharacters * 0.35)) {
    return {
      text: `${window.slice(0, wordEnd).trimEnd()}…`,
      wasTruncated: true,
    };
  }

  return {
    text: `${window.trimEnd()}…`,
    wasTruncated: true,
  };
}

/** Preview for the card + full copy for overflow dialog. */
export type PreviewField = {
  preview: string;
  full: string;
  overflow: boolean;
};

export function previewField(text: string, max: number): PreviewField {
  const full = stripDashes(text);
  if (!full) return { preview: "", full: "", overflow: false };
  const truncated = truncateAtSentence(full, max);
  return {
    preview: truncated.text,
    full,
    overflow: truncated.wasTruncated,
  };
}

export function hostLabel(website: string): string {
  try {
    return new URL(
      website.startsWith("http") ? website : `https://${website}`
    ).hostname.replace(/^www\./, "");
  } catch {
    return website.replace(/^https?:\/\//, "").replace(/^www\./, "");
  }
}

export function joinList(items: string[], max = 4): string {
  return items.filter(Boolean).slice(0, max).join(", ");
}

export function summaryJoin(items: string[]): string {
  if (items.length === 0) return "untapped channels";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${joinList(items.slice(0, -1))}, and ${items[items.length - 1]}`;
}

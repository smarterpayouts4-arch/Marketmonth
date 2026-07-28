/**
 * Owner-supplied supplemental context for content directions.
 * Not website evidence — never assigned evidence IDs.
 */

export type ExtraContextSource = "pasted" | "uploaded_file" | "combined";

export type ExtraContextPayload = {
  text: string;
  source: ExtraContextSource;
  filenames?: string[];
};

export const EXTRA_CONTEXT_MAX_CHARS = 20_000;
export const EXTRA_CONTEXT_MAX_FILES = 3;
export const EXTRA_CONTEXT_MAX_FILE_BYTES = 250 * 1024;
export const EXTRA_CONTEXT_ALLOWED_EXTENSIONS = [".txt", ".md"] as const;

export type ExtraContextValidation =
  | { ok: true; value: ExtraContextPayload }
  | { ok: false; error: string };

export function validateExtraContext(
  raw: unknown
): ExtraContextValidation {
  if (raw === undefined || raw === null) {
    return {
      ok: true,
      value: { text: "", source: "pasted" },
    };
  }
  if (typeof raw !== "object") {
    return { ok: false, error: "extraContext must be an object" };
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.text !== "string") {
    return { ok: false, error: "extraContext.text must be a string" };
  }
  const text = o.text;
  if (text.length > EXTRA_CONTEXT_MAX_CHARS) {
    return {
      ok: false,
      error: `extraContext exceeds ${EXTRA_CONTEXT_MAX_CHARS.toLocaleString()} characters`,
    };
  }
  const source = o.source;
  if (
    source !== "pasted" &&
    source !== "uploaded_file" &&
    source !== "combined"
  ) {
    return { ok: false, error: "extraContext.source is invalid" };
  }
  let filenames: string[] | undefined;
  if (o.filenames !== undefined) {
    if (!Array.isArray(o.filenames)) {
      return { ok: false, error: "extraContext.filenames must be an array" };
    }
    if (o.filenames.length > EXTRA_CONTEXT_MAX_FILES) {
      return {
        ok: false,
        error: `At most ${EXTRA_CONTEXT_MAX_FILES} files allowed`,
      };
    }
    for (const name of o.filenames) {
      if (typeof name !== "string") {
        return { ok: false, error: "extraContext.filenames must be strings" };
      }
      if (!isAllowedContextFilename(name)) {
        return {
          ok: false,
          error: `Unsupported file type: ${name}. Use .txt or .md only.`,
        };
      }
    }
    filenames = o.filenames;
  }

  // Empty text is allowed (omit from brain); source still validated
  return {
    ok: true,
    value: {
      text,
      source,
      ...(filenames && filenames.length > 0 ? { filenames } : {}),
    },
  };
}

export function isAllowedContextFilename(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return EXTRA_CONTEXT_ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** Apply owner-confirmed notes onto brain context (not evidence). */
export function withOwnerConfirmedContext(
  context: import("./types").ContentBrainContext,
  extra?: ExtraContextPayload | null
): import("./types").ContentBrainContext {
  const text = extra?.text?.trim() ?? "";
  if (!text) {
    return { ...context, ownerConfirmed: undefined };
  }
  return {
    ...context,
    ownerConfirmed: {
      text,
      source: extra!.source,
      filenames: extra?.filenames ?? [],
    },
  };
}

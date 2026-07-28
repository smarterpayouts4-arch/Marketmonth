import {
  EXTRA_CONTEXT_ALLOWED_EXTENSIONS,
  EXTRA_CONTEXT_MAX_CHARS,
  EXTRA_CONTEXT_MAX_FILE_BYTES,
  EXTRA_CONTEXT_MAX_FILES,
  isAllowedContextFilename,
  type ExtraContextPayload,
  type ExtraContextSource,
} from "@/brain/content/extra-context";

export type AttachedContextFile = {
  id: string;
  name: string;
  text: string;
  sizeBytes: number;
};

export type ExtraContextUiState = {
  pastedText: string;
  files: AttachedContextFile[];
  error: string | null;
};

export function emptyExtraContextUi(): ExtraContextUiState {
  return { pastedText: "", files: [], error: null };
}

export function combinedContextLength(state: ExtraContextUiState): number {
  return state.pastedText.length + state.files.reduce((n, f) => n + f.text.length, 0);
}

export function buildExtraContextPayload(
  state: ExtraContextUiState
): ExtraContextPayload | null {
  const pasted = state.pastedText;
  const fileText = state.files.map((f) => f.text).join("\n\n");
  const parts: string[] = [];
  if (pasted.trim()) parts.push(pasted);
  if (fileText.trim()) parts.push(fileText);
  const text = parts.join("\n\n");
  if (!text.trim()) return null;

  let source: ExtraContextSource = "pasted";
  if (pasted.trim() && state.files.length > 0) source = "combined";
  else if (state.files.length > 0) source = "uploaded_file";

  return {
    text,
    source,
    ...(state.files.length > 0
      ? { filenames: state.files.map((f) => f.name) }
      : {}),
  };
}

export function canSubmitWithContext(state: ExtraContextUiState): {
  ok: boolean;
  error: string | null;
} {
  const total = combinedContextLength(state);
  if (total > EXTRA_CONTEXT_MAX_CHARS) {
    return {
      ok: false,
      error: `Context exceeds ${EXTRA_CONTEXT_MAX_CHARS.toLocaleString()} characters. Remove content before generating.`,
    };
  }
  if (state.error) {
    return { ok: false, error: state.error };
  }
  return { ok: true, error: null };
}

export async function readDroppedFiles(
  fileList: FileList | File[],
  current: AttachedContextFile[]
): Promise<{ files: AttachedContextFile[]; error: string | null }> {
  const incoming = Array.from(fileList);
  const next = [...current];
  let error: string | null = null;

  for (const file of incoming) {
    if (next.length >= EXTRA_CONTEXT_MAX_FILES) {
      error = `You can attach at most ${EXTRA_CONTEXT_MAX_FILES} files.`;
      break;
    }
    if (!isAllowedContextFilename(file.name)) {
      error = `Unsupported file type: ${file.name}. Use .txt or .md only.`;
      continue;
    }
    if (file.size > EXTRA_CONTEXT_MAX_FILE_BYTES) {
      error = `File too large: ${file.name}. Maximum is 250 KB per file.`;
      continue;
    }
    try {
      const text = await file.text();
      // Reject if not valid UTF-8-ish (browser File.text already decodes as UTF-8)
      if (text.includes("\uFFFD") && file.size > 0) {
        error = `Could not read ${file.name} as UTF-8 plain text.`;
        continue;
      }
      const provisionalTotal =
        next.reduce((n, f) => n + f.text.length, 0) + text.length;
      // pasted checked separately at submit; here guard file stack alone vs max
      if (provisionalTotal > EXTRA_CONTEXT_MAX_CHARS) {
        error = `Adding ${file.name} would exceed ${EXTRA_CONTEXT_MAX_CHARS.toLocaleString()} characters.`;
        continue;
      }
      next.push({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        text,
        sizeBytes: file.size,
      });
    } catch {
      error = `Could not read ${file.name}.`;
    }
  }

  return { files: next, error };
}

export {
  EXTRA_CONTEXT_ALLOWED_EXTENSIONS,
  EXTRA_CONTEXT_MAX_CHARS,
  EXTRA_CONTEXT_MAX_FILE_BYTES,
  EXTRA_CONTEXT_MAX_FILES,
};

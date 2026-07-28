import type { ContentDraftV1 } from "./types";

const STORAGE_KEY = "mm-content-studio-draft-v1";

export function saveContentDraft(draft: ContentDraftV1): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // private mode / quota
  }
}

export function loadContentDraft(): ContentDraftV1 | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ContentDraftV1;
    if (parsed?.version !== 1 || !parsed.atomId) return null;
    return parsed;
  } catch {
    return null;
  }
}

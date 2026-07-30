import type { ContentAtom } from "@/brain/atom";

import { createAtomRepository } from "./create-atom-repository";
import { readJsonFile } from "./json-store";
import { atomPath } from "./paths";

/**
 * Legacy helpers — prefer `createAtomRepository()`.
 * `saveAtomRecord` persists via the AtomRepository factory.
 */
export async function saveAtomRecord(atom: ContentAtom): Promise<void> {
  await createAtomRepository().save(atom);
}

/** Sync read of the latest JSON envelope (dev-only; null when DB-backed). */
export function loadAtomRecord(atomId: string): ContentAtom | null {
  if (process.env.DATABASE_URL?.trim()) {
    return null;
  }
  const row = readJsonFile<{
    atom?: ContentAtom;
    versions?: { atom: ContentAtom }[];
  }>(atomPath(atomId));
  if (!row) return null;
  if (row.atom) return row.atom;
  if (row.versions?.length) {
    return row.versions.reduce((best, v) =>
      v.atom.atom_version > best.atom.atom_version ? v : best
    ).atom;
  }
  return null;
}

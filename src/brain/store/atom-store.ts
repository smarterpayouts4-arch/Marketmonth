import type { ContentAtom } from "@/brain/atom";

import { readJsonFile, writeJsonAtomic } from "./json-store";
import { atomPath } from "./paths";

export async function saveAtomRecord(atom: ContentAtom): Promise<void> {
  await writeJsonAtomic(atomPath(atom.atom_id), {
    kind: "atom",
    savedAt: new Date().toISOString(),
    atom,
  });
}

export function loadAtomRecord(atomId: string): ContentAtom | null {
  const row = readJsonFile<{ atom: ContentAtom }>(atomPath(atomId));
  return row?.atom ?? null;
}

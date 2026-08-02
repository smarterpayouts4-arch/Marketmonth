import type {
  AtomValidationReport,
  ContentAtom,
} from "@/brain/atom";

export type FetchAtomResult =
  | {
      ok: true;
      atom: ContentAtom;
      validation: AtomValidationReport | null;
      recordRevision: number;
      companyId: string;
      buildKey: string | null;
    }
  | { ok: false; error: string; statusCode: number };

export async function fetchContentAtom(atomId: string): Promise<FetchAtomResult> {
  const res = await fetch(
    `/api/brain/content-atom?atomId=${encodeURIComponent(atomId)}`
  );
  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    atom?: ContentAtom;
    validation?: AtomValidationReport | null;
    recordRevision?: number;
    companyId?: string;
    buildKey?: string | null;
  };
  if (!res.ok || !data.ok || !data.atom) {
    return {
      ok: false,
      error: data.error ?? "Could not load atom",
      statusCode: res.status,
    };
  }
  return {
    ok: true,
    atom: data.atom,
    validation: data.validation ?? null,
    recordRevision: data.recordRevision ?? 1,
    companyId: data.companyId ?? data.atom.lineage.companyId,
    buildKey: data.buildKey ?? null,
  };
}

import { ok, type ToolEnvelope } from "../../contracts/envelope.js";
import { mmListProjectDocs, type ListedProjectDoc } from "./list-docs.js";

export type FoundProjectDoc = ListedProjectDoc & { score: number };

function scoreDoc(query: string, doc: ListedProjectDoc): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const hay = [
    doc.documentId,
    doc.path,
    doc.title ?? "",
    doc.purpose ?? "",
    doc.status ?? "",
    doc.authority ?? "",
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  if (doc.documentId.toLowerCase() === q) score += 100;
  if (doc.path.toLowerCase().includes(q)) score += 40;
  if ((doc.title ?? "").toLowerCase().includes(q)) score += 35;
  if ((doc.purpose ?? "").toLowerCase().includes(q)) score += 25;
  if (hay.includes(q)) score += 15;

  for (const token of q.split(/[\s/_-]+/).filter((t) => t.length >= 3)) {
    if (doc.documentId.toLowerCase().includes(token)) score += 12;
    if (hay.includes(token)) score += 6;
  }
  return score;
}

export async function mmFindProjectDoc(
  query: string,
  limit = 8
): Promise<ToolEnvelope<{ query: string; matches: FoundProjectDoc[]; count: number }>> {
  const listed = await mmListProjectDocs();
  const docs = listed.data?.documents ?? [];
  const matches = docs
    .map((doc) => ({ ...doc, score: scoreDoc(query, doc) }))
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score || a.documentId.localeCompare(b.documentId))
    .slice(0, Math.max(1, Math.min(limit, 20)));

  return ok({ query, matches, count: matches.length });
}

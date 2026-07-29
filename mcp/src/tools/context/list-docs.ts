import fs from "node:fs";
import path from "node:path";

import { getRepoRoot } from "../../lib/repo.js";
import { ok, type ToolEnvelope } from "../../contracts/envelope.js";
import { PROJECT_DOCS } from "../../security/docs-registry.js";

export type ListedProjectDoc = {
  documentId: string;
  path: string;
  title: string | null;
  purpose: string | null;
  status: string | null;
  lastVerified: string | null;
  authority: string | null;
};

type DocsIndexDoc = {
  id?: string;
  path?: string;
  title?: string;
  description?: string;
  status?: string;
  authority?: string;
};

function loadDocsIndexByPath(): Map<string, DocsIndexDoc> {
  const root = getRepoRoot();
  const indexPath = path.join(
    root,
    "project-knowledge/generated/indexes/docs-index.json"
  );
  const byPath = new Map<string, DocsIndexDoc>();
  try {
    const raw = JSON.parse(fs.readFileSync(indexPath, "utf8")) as {
      documents?: DocsIndexDoc[];
    };
    for (const d of raw.documents ?? []) {
      if (d.path) byPath.set(d.path.replace(/\\/g, "/"), d);
    }
  } catch {
    // index optional for listing; registry paths still returned
  }
  return byPath;
}

function frontmatterField(text: string, key: string): string | null {
  const m = text.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
}

export async function mmListProjectDocs(): Promise<
  ToolEnvelope<{ documents: ListedProjectDoc[]; count: number }>
> {
  const root = getRepoRoot();
  const byPath = loadDocsIndexByPath();
  const seenPaths = new Set<string>();
  const documents: ListedProjectDoc[] = [];

  for (const [documentId, rel] of Object.entries(PROJECT_DOCS)) {
    const norm = rel.replace(/\\/g, "/");
    if (seenPaths.has(norm)) continue;
    seenPaths.add(norm);

    const indexed = byPath.get(norm);
    let title = indexed?.title ?? null;
    let status = indexed?.status ?? null;
    let authority = indexed?.authority ?? null;
    let lastVerified: string | null = null;

    try {
      const abs = path.join(root, norm);
      const text = fs.readFileSync(abs, "utf8").slice(0, 4000);
      lastVerified = frontmatterField(text, "last_verified");
      title = title ?? frontmatterField(text, "title");
      status = status ?? frontmatterField(text, "status");
      authority = authority ?? frontmatterField(text, "authority");
    } catch {
      // path may be missing until knowledge:update for generated files
    }

    const purpose = indexed?.description ?? null;

    documents.push({
      documentId,
      path: norm,
      title,
      purpose,
      status,
      lastVerified,
      authority,
    });
  }

  documents.sort((a, b) => a.documentId.localeCompare(b.documentId));
  return ok({ documents, count: documents.length });
}

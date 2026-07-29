import { sha16 } from "../../lib/repo.js";
import { failed, ok, type ToolEnvelope } from "../../contracts/envelope.js";
import { PROJECT_DOCS, type ProjectDocId } from "../../security/docs-registry.js";
import { resolveProjectDoc } from "../../security/paths.js";

export type DocReadFailure = {
  errorCode: "DOCUMENT_NOT_REGISTERED";
  requestedId: string;
  availableAlternatives: string[];
  recommendedAction: string;
};

function alternativesForUnknown(requestedId: string): string[] {
  const ids = Object.keys(PROJECT_DOCS);
  const lower = requestedId.toLowerCase();
  const scored = ids
    .map((id) => {
      const il = id.toLowerCase();
      let score = 0;
      if (il === lower) score = 100;
      else if (il.includes(lower) || lower.includes(il)) score = 50;
      else if (lower.length >= 3 && il.startsWith(lower.slice(0, 3))) score = 20;
      return { id, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  const alts = scored.map((x) => x.id);
  if (alts.length === 0) {
    for (const prefer of [
      "currentState",
      "product",
      "docs_index",
      "agentBootstrap",
      "contentBrain",
    ]) {
      if (prefer in PROJECT_DOCS) alts.push(prefer);
    }
  }
  return [...new Set(alts)].slice(0, 12);
}

export async function mmReadProjectDoc(
  documentId: string
): Promise<ToolEnvelope<{ id: string; path: string; text: string } | DocReadFailure>> {
  if (!(documentId in PROJECT_DOCS)) {
    const availableAlternatives = alternativesForUnknown(documentId);
    return {
      status: "failed",
      data: {
        errorCode: "DOCUMENT_NOT_REGISTERED",
        requestedId: documentId,
        availableAlternatives,
        recommendedAction: "Call mm_list_project_docs or mm_get_agent_bootstrap",
      },
      warnings: [],
      uncertainty: "high",
      error: "DOCUMENT_NOT_REGISTERED",
      artifactType: "document_error",
    };
  }

  try {
    const doc = await resolveProjectDoc(documentId as ProjectDocId);
    return ok(
      { id: documentId, path: doc.rel, text: doc.text },
      {
        source: { path: doc.rel, contentHash: sha16(doc.text), mtimeMs: doc.mtimeMs },
      }
    );
  } catch (e) {
    return failed(e instanceof Error ? e.message : String(e));
  }
}

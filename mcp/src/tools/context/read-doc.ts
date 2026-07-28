import { sha16 } from "../../lib/repo.js";
import { failed, ok, type ToolEnvelope } from "../../contracts/envelope.js";
import { PROJECT_DOCS, type ProjectDocId } from "../../security/docs-registry.js";
import { resolveProjectDoc } from "../../security/paths.js";

export async function mmReadProjectDoc(
  documentId: string
): Promise<ToolEnvelope<{ id: string; path: string; text: string }>> {
  if (!(documentId in PROJECT_DOCS)) {
    return failed(`Unknown document id. Allowed: ${Object.keys(PROJECT_DOCS).join(", ")}`);
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

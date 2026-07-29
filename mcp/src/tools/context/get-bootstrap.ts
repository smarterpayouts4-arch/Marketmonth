import { sha16 } from "../../lib/repo.js";
import { failed, ok, type ToolEnvelope } from "../../contracts/envelope.js";
import { resolveProjectDoc } from "../../security/paths.js";

export async function mmGetAgentBootstrap(): Promise<
  ToolEnvelope<{ id: string; path: string; bootstrap: unknown }>
> {
  try {
    const doc = await resolveProjectDoc("agentBootstrap");
    const bootstrap = JSON.parse(doc.text) as unknown;
    return ok(
      { id: "agentBootstrap", path: doc.rel, bootstrap },
      {
        source: {
          path: doc.rel,
          contentHash: sha16(doc.text),
          mtimeMs: doc.mtimeMs,
        },
      }
    );
  } catch (e) {
    return failed(
      e instanceof Error
        ? e.message
        : String(e) +
            " — run npm run knowledge:update to regenerate agent-bootstrap.json"
    );
  }
}

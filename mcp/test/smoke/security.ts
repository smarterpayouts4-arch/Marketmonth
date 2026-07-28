import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { assertPublicHttpUrl } from "../../src/security/url-policy.js";
import { resolveProjectDoc } from "../../src/security/paths.js";
import { fail, parseEnvelope, toolText } from "./helpers.js";

export async function checkReadProjectDocRejectsTraversal(client: Client): Promise<void> {
  const badDoc = await client.callTool({
    name: "mm_read_project_doc",
    arguments: { documentId: "../../../etc/passwd" as never },
  });
  // SDK may reject schema; if it gets through, envelope must fail
  if (!badDoc.isError) {
    const badText = toolText(badDoc);
    if (badText && !badText.includes("failed") && !badText.includes("Unknown")) {
      // schema validation should have blocked; tolerate MCP error path
      const env = parseEnvelope(badText);
      if (env.status === "complete") fail("path traversal documentId should not succeed");
    }
  }
  console.log("ok mm_read_project_doc rejects non-allowlisted ids");
}

export async function checkUrlPolicyNegatives(): Promise<void> {
  const fileUrl = await assertPublicHttpUrl("file:///etc/passwd");
  if (fileUrl.ok) fail("file:// should be blocked");
  const local = await assertPublicHttpUrl("http://127.0.0.1/");
  if (local.ok) fail("127.0.0.1 should be blocked without allow flag");
  const localhost = await assertPublicHttpUrl("http://localhost/");
  if (localhost.ok) fail("localhost should be blocked");
  console.log("ok url-policy negatives");
}

export async function checkResolveProjectDoc(): Promise<void> {
  try {
    await resolveProjectDoc("product");
  } catch {
    fail("resolveProjectDoc(product) should work");
  }
  console.log("ok paths resolve product");
}

export async function checkDocsRegistryRejectsEnv(): Promise<void> {
  const { PROJECT_DOCS } = await import("../../src/security/docs-registry.js");
  for (const [id, rel] of Object.entries(PROJECT_DOCS)) {
    if (/\.env/i.test(rel) || rel.includes("node_modules")) {
      fail(`docs registry must not allow ${id} → ${rel}`);
    }
  }
  let threw = false;
  try {
    await resolveProjectDoc(".env.local" as never);
  } catch {
    threw = true;
  }
  if (!threw) fail("resolveProjectDoc(.env.local) must fail");
  console.log("ok docs registry rejects env paths");
}

#!/usr/bin/env node
/**
 * Narrow Discovery MCP doctor — repository-side server truth only.
 * Does not observe Cursor's cached tool catalog.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const REQUIRED = [
  "mm_get_agent_bootstrap",
  "mm_list_project_docs",
  "mm_find_project_doc",
  "mm_read_project_doc",
];

function registryHash() {
  const abs = path.join(repoRoot, "mcp/src/security/docs-registry.ts");
  const text = fs.readFileSync(abs, "utf8");
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 12);
}

function toolText(result) {
  return Array.isArray(result.content) &&
    result.content[0] &&
    typeof result.content[0] === "object" &&
    result.content[0].type === "text" &&
    typeof result.content[0].text === "string"
    ? result.content[0].text
    : "";
}

async function main() {
  const hash = registryHash();
  let serverHealthy = false;
  let requiredPresent = false;
  let legacyHealthy = false;
  let detail = "";

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", "mcp/src/stdio-server.ts"],
    cwd: repoRoot,
    stderr: "pipe",
    env: {
      ...process.env,
      MARKETMONTH_MCP_ALLOW_PRIVATE_NETWORK: "",
    },
  });

  const client = new Client({ name: "marketmonth-mcp-doctor", version: "0.1.0" });

  try {
    await client.connect(transport);
    serverHealthy = true;

    const listed = await client.listTools();
    const names = new Set(listed.tools.map((t) => t.name));
    const missing = REQUIRED.filter((t) => !names.has(t));
    requiredPresent = missing.length === 0;
    if (!requiredPresent) {
      detail = `missing tools: ${missing.join(", ")}`;
    }

    const read = await client.callTool({
      name: "mm_read_project_doc",
      arguments: { documentId: "agentBootstrap" },
    });
    const raw = toolText(read);
    let env;
    try {
      env = JSON.parse(raw);
    } catch {
      env = null;
    }
    legacyHealthy =
      env?.status === "complete" &&
      typeof env?.data?.text === "string" &&
      env.data.text.includes("requiredFirstReads");

    if (!legacyHealthy && !detail) {
      detail = "mm_read_project_doc(agentBootstrap) did not return bootstrap JSON text";
    }

    await client.close();
  } catch (e) {
    detail = e instanceof Error ? e.message : String(e);
    try {
      await client.close();
    } catch {
      /* ignore */
    }
  }

  console.log(
    `Repository MCP server: ${serverHealthy ? "healthy" : "unhealthy"}`
  );
  console.log(`Required tools present: ${requiredPresent ? "yes" : "no"}`);
  console.log(
    `Legacy bootstrap fallback: ${legacyHealthy ? "healthy" : "unhealthy"}`
  );
  console.log("Cursor catalog status: not observable");
  console.log("Action after schema changes: restart or reload Discovery MCP");
  console.log(`Registry hash: ${hash}`);
  if (detail) console.log(`Detail: ${detail}`);

  if (!serverHealthy || !requiredPresent || !legacyHealthy) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

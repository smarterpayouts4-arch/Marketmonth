import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

export const REQUIRED_TOOLS = [
  "mm_product_overview",
  "mm_architecture_map",
  "mm_route_inventory",
  "mm_stage_for_request",
  "mm_list_project_docs",
  "mm_get_agent_bootstrap",
  "mm_find_project_doc",
  "mm_read_project_doc",
  "mm_crawl_website",
  "mm_extract_brand",
  "mm_analyze_seo",
  "mm_discover_social",
  "mm_suggest_competitors",
  "mm_draft_strategy",
  "mm_analyze_website",
  "mm_seo_status",
];

export function fail(msg: string): never {
  console.error("FAIL:", msg);
  process.exit(1);
}

export function parseEnvelope(text: string) {
  try {
    return JSON.parse(text) as {
      status: string;
      data: unknown;
      error?: string;
      warnings?: string[];
    };
  } catch {
    fail(`Invalid JSON envelope: ${text.slice(0, 200)}`);
  }
}

export function toolText(result: { content?: unknown }): string {
  return Array.isArray(result.content) &&
    result.content[0] &&
    typeof result.content[0] === "object" &&
    result.content[0] !== null &&
    "type" in result.content[0] &&
    result.content[0].type === "text" &&
    "text" in result.content[0] &&
    typeof result.content[0].text === "string"
    ? result.content[0].text
    : "";
}

export async function connectSmokeClient(): Promise<Client> {
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

  const client = new Client({ name: "marketmonth-mcp-smoke", version: "0.1.0" });
  await client.connect(transport);
  return client;
}

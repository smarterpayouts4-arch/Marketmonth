#!/usr/bin/env node
/**
 * MarketMonth Discovery MCP — stdio transport.
 * stdout = MCP protocol only. Diagnostics → stderr via log().
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { createServer } from "./create-server.js";
import { log } from "./lib/log.js";

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("stdio server ready");
}

main().catch((err) => {
  log("fatal", err instanceof Error ? err.message : err);
  process.exit(1);
});

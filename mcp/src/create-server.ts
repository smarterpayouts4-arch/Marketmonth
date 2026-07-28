/**
 * Thin orchestrator: Discovery MCP server wiring.
 * Specialists live in ./create-server/*
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerContextTools } from "./create-server/reg-context.js";
import { registerDiscoveryTools } from "./create-server/reg-discovery.js";
import { registerSeoTools } from "./create-server/reg-seo.js";

export function createServer() {
  const server = new McpServer({
    name: "marketmonth-discovery",
    version: "0.1.0",
  });

  registerContextTools(server);
  registerDiscoveryTools(server);
  registerSeoTools(server);

  return server;
}

/** Stdio MCP: stdout is protocol-only. All diagnostics go to stderr. */
export function log(...args: unknown[]) {
  console.error("[marketmonth-mcp]", ...args);
}

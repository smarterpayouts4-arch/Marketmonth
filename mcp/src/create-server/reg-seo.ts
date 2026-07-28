import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { asTextContent } from "../contracts/envelope.js";
import { mmSeoStatus } from "../tools/seo/status.js";

export function registerSeoTools(server: McpServer) {
  server.registerTool(
    "mm_seo_status",
    {
      description:
        "Reports MarketMonth product-site SEO memory status (stale flag, recommendation count) — not customer LEARN SEO. " +
        "Use when working on MarketMonth's own SEO surfaces. " +
        "Do not use for customer website SEO during LEARN (use mm_analyze_seo instead). " +
        "Source: product SEO job/state. " +
        "If insufficient, next: mm_read_project_doc(siteSeo).",
    },
    async () => asTextContent(await mmSeoStatus())
  );
}

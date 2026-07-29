import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

import { asTextContent } from "../contracts/envelope.js";
import { PROJECT_DOCS } from "../security/docs-registry.js";
import { mmArchitectureMap } from "../tools/context/parse-architecture.js";
import { mmProductOverview } from "../tools/context/parse-product.js";
import { mmFindProjectDoc } from "../tools/context/find-doc.js";
import { mmGetAgentBootstrap } from "../tools/context/get-bootstrap.js";
import { mmListProjectDocs } from "../tools/context/list-docs.js";
import { mmReadProjectDoc } from "../tools/context/read-doc.js";
import { mmRouteInventory } from "../tools/context/route-inventory.js";
import { mmStageForRequest } from "../tools/context/stage-for-request.js";

const DOC_ID_HINT = Object.keys(PROJECT_DOCS).join(", ");

export function registerContextTools(server: McpServer) {
  server.registerTool(
    "mm_product_overview",
    {
      description:
        "Provides MarketMonth north star, six-stage product loop, and Content Universe definition from project-knowledge/PRODUCT.md. " +
        "Use before product/UX or stage-boundary work when you need the canonical loop definition. " +
        "Do not use for live implementation details, CURRENT_STATE status, or external facts. " +
        "Source: project-knowledge/PRODUCT.md. " +
        "If insufficient, next: mm_read_project_doc(currentState) or mm_architecture_map.",
    },
    async () => asTextContent(await mmProductOverview())
  );

  server.registerTool(
    "mm_architecture_map",
    {
      description:
        "Provides surface ownership and route↔stage intent from project-knowledge/ARCHITECTURE.md. " +
        "Use before structural or ownership changes. " +
        "Do not use for CURRENT_STATE live/mocked status or library API docs. " +
        "Source: project-knowledge/ARCHITECTURE.md. " +
        "If insufficient, next: mm_route_inventory or mm_read_project_doc(file_ownership).",
    },
    async () => asTextContent(await mmArchitectureMap())
  );

  server.registerTool(
    "mm_route_inventory",
    {
      description:
        "Lists live Next.js page routes under src/app (excludes reference-library). " +
        "Use when you need the actual route tree, not doctrine. " +
        "Do not use for product strategy or CURRENT_STATE narrative. " +
        "Source: filesystem scan of src/app. " +
        "If insufficient, next: mm_read_project_doc(routeMap) or inspect source.",
    },
    async () => asTextContent(await mmRouteInventory())
  );

  server.registerTool(
    "mm_stage_for_request",
    {
      description:
        "Returns a STAGE RECOMMENDATION with rationale for a natural-language request — guidance only, not an unquestionable router. " +
        "Use to orient toward LEARN/STRATEGIZE/…/ENGINEERING/CROSS_STAGE and a CURRENT_STATE area before edits. " +
        "Do not treat the result as mandatory; agents may override with evidence. " +
        "Source: PRODUCT.md loop keywords + CURRENT_STATE area hints. " +
        "If UNCERTAIN/low confidence, next: read CURRENT_STATE + PRODUCT directly.",
      inputSchema: {
        request: z.string().min(1).describe("User or agent request text"),
      },
    },
    async ({ request }) => asTextContent(await mmStageForRequest(request))
  );

  server.registerTool(
    "mm_list_project_docs",
    {
      description:
        "Lists allowlisted Discovery MCP document IDs with path, title, purpose, status, and last_verified when known. " +
        "Use when you do not know the documentId for mm_read_project_doc. " +
        "Do not use to read full document bodies. " +
        "Source: PROJECT_DOCS registry + docs-index metadata. " +
        "If insufficient, next: mm_get_agent_bootstrap or mm_read_project_doc(docs_index).",
    },
    async () => asTextContent(await mmListProjectDocs())
  );

  server.registerTool(
    "mm_get_agent_bootstrap",
    {
      description:
        "Returns the generated agent-bootstrap.json (required first reads, status vocabulary, docs-index pointer). " +
        "Use at cold start for deterministic entry points without reading all doctrine. " +
        "Do not treat bootstrap as product SoT — it only points at canonical paths. " +
        "Source: project-knowledge/generated/indexes/agent-bootstrap.json (from knowledge:update). " +
        "If missing, next: npm run knowledge:update then retry.",
    },
    async () => asTextContent(await mmGetAgentBootstrap())
  );

  server.registerTool(
    "mm_find_project_doc",
    {
      description:
        "Finds allowlisted document IDs by free-text query (id, path, title, purpose). " +
        "Use when you know the topic but not the documentId. " +
        "Do not use to read full bodies — follow with mm_read_project_doc. " +
        "Source: PROJECT_DOCS registry + docs-index metadata. " +
        "If empty, next: mm_list_project_docs.",
      inputSchema: {
        query: z.string().min(1).describe("Search text, e.g. content brain or adr0002"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(20)
          .optional()
          .describe("Max matches (default 8)"),
      },
    },
    async ({ query, limit }) =>
      asTextContent(await mmFindProjectDoc(query, limit ?? 8))
  );

  server.registerTool(
    "mm_read_project_doc",
    {
      description:
        "Retrieves a canonical MarketMonth product, architecture, current-state, feature, quality, or generated-map document by allowlisted document ID. " +
        "Use before implementing product or structural changes when the relevant canonical document ID is known. " +
        "Do not use to inspect live source-code implementation details or external/current facts. " +
        "Source: allowlisted paths in docs-registry (project-knowledge/, AGENTS.md, docs/ai/*). " +
        "Unknown IDs return DOCUMENT_NOT_REGISTERED with availableAlternatives — then call mm_list_project_docs. " +
        `Known ids include: ${DOC_ID_HINT}.`,
      inputSchema: {
        documentId: z
          .string()
          .min(1)
          .describe(`Allowlisted document id (e.g. currentState, contentBrain). Known: ${DOC_ID_HINT}`),
      },
    },
    async ({ documentId }) => asTextContent(await mmReadProjectDoc(documentId))
  );
}

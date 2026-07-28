import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

import { asTextContent } from "../contracts/envelope.js";
import { PROJECT_DOCS, type ProjectDocId } from "../security/docs-registry.js";
import { mmArchitectureMap } from "../tools/context/parse-architecture.js";
import { mmProductOverview } from "../tools/context/parse-product.js";
import { mmReadProjectDoc } from "../tools/context/read-doc.js";
import { mmRouteInventory } from "../tools/context/route-inventory.js";
import { mmStageForRequest } from "../tools/context/stage-for-request.js";

const DOC_IDS = Object.keys(PROJECT_DOCS) as [ProjectDocId, ...ProjectDocId[]];

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
    "mm_read_project_doc",
    {
      description:
        "Retrieves a canonical MarketMonth product, architecture, current-state, feature, quality, or generated-map document by allowlisted document ID. " +
        "Use before implementing product or structural changes when the relevant canonical document ID is known. " +
        "Do not use to inspect live source-code implementation details or external/current facts. " +
        "Source: allowlisted paths in docs-registry (project-knowledge/, AGENTS.md, docs/ai/*). " +
        "For unknown document locations, next: mm_read_project_doc(docs_index) or the ask path / offline docs-index.json.",
      inputSchema: {
        documentId: z.enum(DOC_IDS).describe(`One of: ${DOC_IDS.join(", ")}`),
      },
    },
    async ({ documentId }) => asTextContent(await mmReadProjectDoc(documentId))
  );
}

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { REQUIRED_TOOLS, fail, parseEnvelope, toolText } from "./helpers.js";

export async function checkToolsList(client: Client): Promise<void> {
  const listed = await client.listTools();
  const names = new Set(listed.tools.map((t) => t.name));
  for (const t of REQUIRED_TOOLS) {
    if (!names.has(t)) fail(`Missing tool: ${t}`);
  }
  console.log(`ok tools/list (${listed.tools.length} tools)`);
}

export async function checkSeoStatus(client: Client): Promise<void> {
  const result = await client.callTool({ name: "mm_seo_status", arguments: {} });
  const env = parseEnvelope(toolText(result));
  if (env.status === "failed") fail(`mm_seo_status failed: ${env.error}`);
  const data = env.data as { stale?: boolean; recommendationCount?: number };
  if (typeof data?.stale !== "boolean") fail("mm_seo_status missing stale flag");
  console.log("ok mm_seo_status");
}

export async function checkProductOverview(client: Client): Promise<void> {
  const product = await client.callTool({ name: "mm_product_overview", arguments: {} });
  const productEnv = parseEnvelope(toolText(product));
  if (productEnv.status === "failed") fail(`mm_product_overview failed: ${productEnv.error}`);
  const pdata = productEnv.data as { stages?: unknown[]; northStar?: string };
  if (!pdata?.northStar || !Array.isArray(pdata.stages) || pdata.stages.length < 6) {
    fail("mm_product_overview missing northStar or 6 stages");
  }
  console.log("ok mm_product_overview");
}

export async function checkRouteInventory(client: Client): Promise<void> {
  const routes = await client.callTool({ name: "mm_route_inventory", arguments: {} });
  const routesEnv = parseEnvelope(toolText(routes));
  const rdata = routesEnv.data as {
    routes?: { sourceFile: string; route: string }[];
  };
  if (!rdata?.routes?.length) fail("mm_route_inventory empty");
  if (
    rdata.routes.some(
      (r) =>
        r.sourceFile.includes("Refrence folder") ||
        r.sourceFile.includes("reference-library")
    )
  ) {
    fail("reference-library leaked into route inventory");
  }
  console.log(`ok mm_route_inventory (${rdata.routes.length} routes)`);
}

export async function checkStageForRequest(client: Client): Promise<void> {
  const stage = await client.callTool({
    name: "mm_stage_for_request",
    arguments: { request: "crawl a website and learn the business" },
  });
  const stageEnv = parseEnvelope(toolText(stage));
  const sdata = stageEnv.data as {
    primaryStage?: string;
    recommendedStage?: string;
    rationale?: string[];
  };
  const stageId = sdata.recommendedStage ?? sdata.primaryStage;
  if (stageId !== "LEARN" && stageId !== "CROSS_STAGE") {
    fail(`Expected LEARN stage recommendation, got ${stageId}`);
  }
  if (!Array.isArray(sdata.rationale) || !sdata.rationale.length) {
    fail("mm_stage_for_request missing rationale (must guide, not silently decide)");
  }
  console.log("ok mm_stage_for_request");
}

export async function checkReadProjectDoc(client: Client): Promise<void> {
  const doc = await client.callTool({
    name: "mm_read_project_doc",
    arguments: { documentId: "currentState" },
  });
  const docEnv = parseEnvelope(toolText(doc));
  if (docEnv.status !== "complete") fail("mm_read_project_doc currentState failed");
  console.log("ok mm_read_project_doc");
}

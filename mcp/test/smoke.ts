#!/usr/bin/env node
/**
 * Protocol smoke — thin orchestrator.
 * Specialists live in ./smoke/*
 * Network discovery tools are not exercised live here.
 */
import {
  checkProductOverview,
  checkReadProjectDoc,
  checkRouteInventory,
  checkSeoStatus,
  checkStageForRequest,
  checkToolsList,
} from "./smoke/context.js";
import { connectSmokeClient } from "./smoke/helpers.js";
import {
  checkDocsRegistryRejectsEnv,
  checkReadProjectDocRejectsTraversal,
  checkResolveProjectDoc,
  checkUrlPolicyNegatives,
} from "./smoke/security.js";
import { testAllowlistDrift } from "./smoke/allowlist-drift.js";

async function main() {
  const client = await connectSmokeClient();

  await checkToolsList(client);
  await checkProductOverview(client);
  await checkRouteInventory(client);
  await checkStageForRequest(client);
  await checkReadProjectDoc(client);
  await checkSeoStatus(client);
  await checkReadProjectDocRejectsTraversal(client);

  // Direct security unit checks (no network)
  await checkUrlPolicyNegatives();
  await checkResolveProjectDoc();
  await checkDocsRegistryRejectsEnv();
  await testAllowlistDrift();

  const brain = await client.callTool({
    name: "mm_read_project_doc",
    arguments: { documentId: "contentBrain" },
  });
  if ("isError" in brain && brain.isError) {
    throw new Error("mm_read_project_doc(contentBrain) failed");
  }

  await client.close();
  console.log("PASS mcp smoke");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

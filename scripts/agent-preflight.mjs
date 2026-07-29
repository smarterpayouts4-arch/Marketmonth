#!/usr/bin/env node
/**
 * Minimal workflow context formatter — not a new authority.
 * Resolves APS workflow required_context → canonical paths.
 * Bootstrap rule decides where to begin; this only lists workflow reads.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATUS_VOCABULARY = ["Live", "Partial", "Mocked", "Planned"];

const STUB_TO_CANONICAL = {
  "PROJECT.md": "project-knowledge/PROJECT.md",
  "ARCHITECTURE.md": "project-knowledge/ARCHITECTURE.md",
  "PRODUCT.md": "project-knowledge/PRODUCT.md",
  "CURRENT_STATE.md": "project-knowledge/CURRENT_STATE.md",
  "COMMANDS.md": "project-knowledge/COMMANDS.md",
  "DESIGN-SYSTEM.md": "project-knowledge/DESIGN-SYSTEM.md",
  "DATA-FLOWS.md": "project-knowledge/DATA-FLOWS.md",
  "PROTECTED-AREAS.md": "project-knowledge/PROTECTED-AREAS.md",
  "KNOWN-RISKS.md": "project-knowledge/KNOWN-RISKS.md",
  "DEFINITION-OF-DONE.md": "project-knowledge/DEFINITION-OF-DONE.md",
};

function parseArgs(argv) {
  let workflow = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--workflow" && argv[i + 1]) {
      workflow = argv[++i];
    }
  }
  return { workflow };
}

function resolveCanonical(stub) {
  const base = path.basename(stub);
  if (STUB_TO_CANONICAL[base]) return STUB_TO_CANONICAL[base];
  if (stub.startsWith("project-knowledge/")) return stub.replace(/\\/g, "/");
  return `project-knowledge/${base}`;
}

function main() {
  const { workflow } = parseArgs(process.argv.slice(2));
  if (!workflow) {
    console.error("Usage: npm run agent:preflight -- --workflow <id>");
    process.exit(1);
  }

  const manifestPath = path.join(
    repoRoot,
    "agent-prompt-system/manifest.json"
  );
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const wf = (manifest.workflows || []).find((w) => w.id === workflow);
  if (!wf) {
    console.error(`Unknown workflow id: ${workflow}`);
    process.exit(1);
  }

  const fromWorkflow = (wf.required_context || []).map(resolveCanonical);
  const requiredReads = ["AGENTS.md", ...fromWorkflow];
  // de-dupe preserving order
  const seen = new Set();
  const deduped = requiredReads.filter((p) => {
    if (seen.has(p)) return false;
    seen.add(p);
    return true;
  });

  const packet = {
    workflow,
    requiredReads: deduped,
    discoveryTool: "mm_find_project_doc",
    statusVocabulary: STATUS_VOCABULARY,
  };

  console.log(JSON.stringify(packet, null, 2));
}

main();

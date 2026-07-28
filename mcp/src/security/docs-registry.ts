/**
 * Allowlisted project documents for Discovery MCP.
 * Tools must use document IDs only — never arbitrary paths from model input.
 * MCP may read these artifacts; must NOT modify knowledge, source, or generated maps.
 */
export const PROJECT_DOCS = {
  product: "project-knowledge/PRODUCT.md",
  architecture: "project-knowledge/ARCHITECTURE.md",
  current_state: "project-knowledge/CURRENT_STATE.md",
  currentState: "project-knowledge/CURRENT_STATE.md",
  project: "project-knowledge/PROJECT.md",
  commands: "project-knowledge/COMMANDS.md",
  dataFlows: "project-knowledge/DATA-FLOWS.md",
  dataModel: "project-knowledge/DATA_MODEL.md",
  designSystem: "project-knowledge/DESIGN-SYSTEM.md",
  risks: "project-knowledge/KNOWN-RISKS.md",
  protectedAreas: "project-knowledge/PROTECTED-AREAS.md",
  definitionOfDone: "project-knowledge/DEFINITION-OF-DONE.md",
  knowledgeReadme: "project-knowledge/README.md",
  contentBrain: "project-knowledge/CONTENT_BRAIN.md",
  domainGlossary: "project-knowledge/DOMAIN_GLOSSARY.md",
  ideaLabTopicStrategy: "project-knowledge/IDEA_LAB_TOPIC_STRATEGY.md",
  ideaLabDirectionHardening: "project-knowledge/IDEA_LAB_DIRECTION_HARDENING.md",
  contentBrainStabilization: "docs/ai/content-brain-stabilization.md",
  siteSeo: "project-knowledge/FEATURES/site-seo.md",
  discoveryEngine: "project-knowledge/FEATURES/discovery-engine.md",
  qualityRubric: "project-knowledge/QUALITY_RUBRIC.md",
  ownershipRules: "project-knowledge/ownership-rules.json",
  brandChangeMap: "project-knowledge/BRAND_CHANGE_MAP.md",
  startHere: "docs/START_HERE.md",
  agents: "AGENTS.md",
  mcp: "docs/ai/mcp.md",
  agentToolchain: "docs/ai/agent-toolchain.md",
  route_map: "project-knowledge/generated/maps/ROUTE_MAP.md",
  routeMap: "project-knowledge/generated/maps/ROUTE_MAP.md",
  api_map: "project-knowledge/generated/maps/API_MAP.md",
  apiMap: "project-knowledge/generated/maps/API_MAP.md",
  env_map: "project-knowledge/generated/maps/ENV_MAP.md",
  envMap: "project-knowledge/generated/maps/ENV_MAP.md",
  file_ownership: "project-knowledge/generated/maps/FILE_OWNERSHIP.md",
  structure_warnings: "project-knowledge/generated/reports/STRUCTURE_WARNINGS.md",
  docs_index: "project-knowledge/generated/indexes/docs-index.json",
  manifest: "project-knowledge/generated/indexes/manifest.json",
} as const;

export type ProjectDocId = keyof typeof PROJECT_DOCS;

/** Explicit write ban — Discovery MCP must never modify these trees */
export const MCP_WRITE_FORBIDDEN_PREFIXES = [
  "project-knowledge/",
  "src/",
  "agent-prompt-system/",
] as const;

/**
 * Thin orchestrator for knowledge scanning.
 * Specialists live in ./scan/*
 */
export {
  GENERATED_HEADER,
  generatedHeader,
  EXCLUDE_DIR_NAMES,
  repoRoot,
  knowledgeRoot,
} from "./scan/roots.mjs";
export { walkFiles, relPosix, normalizeText, contentHash } from "./scan/fs.mjs";
export { expectedStageForRoute, loadRouteStageRules } from "./scan/routes.mjs";
export { parseEnvExample, collectProcessEnvRefs } from "./scan/env.mjs";
export { parseFrontmatter } from "./scan/frontmatter.mjs";
export { loadOwnershipRules, matchOwner } from "./scan/ownership.mjs";
export { generatedPath, writeGeneratedFile } from "./scan/write.mjs";
export { mdTable } from "./scan/md.mjs";
export { buildArtifactBundle } from "./scan/artifacts.mjs";
export { buildGeneratedContents } from "./scan/contents.mjs";
export { resolveNextRoute, routeFileKind } from "./resolve-next-route.mjs";

/**
 * Compatibility entry — prefer `npm run mcp:server` (stdio MCP).
 */
export { createServer } from "./src/create-server.js";
export {
  mmCrawlWebsite,
  mmExtractBrand,
  mmAnalyzeSeo,
  mmDiscoverSocial,
  mmSuggestCompetitors,
  mmDraftStrategy,
  mmAnalyzeWebsite,
} from "./src/tools/discovery/handlers.js";

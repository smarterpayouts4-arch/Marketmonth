import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

import { asTextContent } from "../contracts/envelope.js";
import {
  mmAnalyzeSeo,
  mmAnalyzeWebsite,
  mmCrawlWebsite,
  mmDiscoverSocial,
  mmDraftStrategy,
  mmExtractBrand,
  mmSuggestCompetitors,
} from "../tools/discovery/handlers.js";

const urlInput = {
  url: z.string().url().describe("Public http(s) website URL"),
};

export function registerDiscoveryTools(server: McpServer) {
  server.registerTool(
    "mm_crawl_website",
    {
      description:
        "Crawls a public customer website (bounded pages) with SSRF protection. " +
        "Use as the first LEARN step when you need raw page content for brand/SEO/social. " +
        "Do not use for MarketMonth product docs, library APIs, or YouTube research. " +
        "Source: live HTTP fetch of the given URL. " +
        "If insufficient, next: mm_extract_brand / mm_analyze_seo / mm_analyze_website.",
      inputSchema: urlInput,
    },
    async ({ url }) => asTextContent(await mmCrawlWebsite(url))
  );

  server.registerTool(
    "mm_extract_brand",
    {
      description:
        "Extracts brand signals (name, offers, voice cues) from a public website crawl. " +
        "Use during LEARN after crawl when building a brand profile. " +
        "Do not use for MarketMonth's own brand doctrine or mock BrandProfile UI types. " +
        "Source: crawl + heuristics/LLM when keyed. " +
        "If insufficient, next: mm_analyze_website for the full pipeline.",
      inputSchema: urlInput,
    },
    async ({ url }) => asTextContent(await mmExtractBrand(url))
  );

  server.registerTool(
    "mm_analyze_seo",
    {
      description:
        "Analyzes SEO signals from a public customer website crawl. " +
        "Use during LEARN for the customer's site SEO — not MarketMonth site SEO memory. " +
        "Do not use for mm_seo_status (product site SEO). " +
        "Source: crawl metadata/content heuristics. " +
        "If insufficient, next: mm_analyze_website.",
      inputSchema: urlInput,
    },
    async ({ url }) => asTextContent(await mmAnalyzeSeo(url))
  );

  server.registerTool(
    "mm_discover_social",
    {
      description:
        "Discovers social profile links from a public website crawl. " +
        "Use during LEARN social stage. " +
        "Do not use for posting, publishing, or transcript research. " +
        "Source: crawl link heuristics. " +
        "If insufficient, next: mm_analyze_website.",
      inputSchema: urlInput,
    },
    async ({ url }) => asTextContent(await mmDiscoverSocial(url))
  );

  server.registerTool(
    "mm_suggest_competitors",
    {
      description:
        "Suggests competitor hints from crawl + brand signals (heuristic). " +
        "Use during LEARN competitor stage. " +
        "Do not treat results as exhaustive market research. " +
        "Source: crawl/brand heuristics. " +
        "If insufficient, next: advisory web research (Perplexity) after LEARN context exists.",
      inputSchema: urlInput,
    },
    async ({ url }) => asTextContent(await mmSuggestCompetitors(url))
  );

  server.registerTool(
    "mm_draft_strategy",
    {
      description:
        "Drafts a strategy preview from a brand profile + intent. Requires human review — does not publish. " +
        "Use after LEARN when moving toward STRATEGIZE. " +
        "Do not use as final approved strategy or to generate assets. " +
        "Source: brand profile object + OpenAI when keyed. " +
        "If insufficient, next: mm_read_project_doc(product) and human review path.",
      inputSchema: {
        brandProfile: z.unknown().describe("BrandProfile-shaped object"),
        goal: z.enum(["awareness", "leads", "sales", "loyalty"]),
        promoteFirst: z.string().min(1),
        reach: z.enum(["local", "national", "online_broad"]),
        brandProfileId: z.string().optional(),
      },
    },
    async (args) => asTextContent(await mmDraftStrategy(args))
  );

  server.registerTool(
    "mm_analyze_website",
    {
      description:
        "Runs the full LEARN analyze pipeline (crawl → brand profile). May call LLM if OPENAI_API_KEY is set. " +
        "Use when the agent should perform end-to-end customer website LEARN. " +
        "Do not use for MarketMonth docs, Context7 library questions, or UI verification. " +
        "Source: engine discovery pipeline. " +
        "If insufficient, next: inspect stage tools individually or read CURRENT_STATE Discovery area.",
      inputSchema: urlInput,
    },
    async ({ url }) => asTextContent(await mmAnalyzeWebsite(url))
  );
}

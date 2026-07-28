import { ok, type ToolEnvelope } from "../../contracts/envelope.js";
import { resolveProjectDoc } from "../../security/paths.js";

const STAGE_HINTS: {
  stage: string;
  surface: string;
  currentStateArea: string;
  keywords: string[];
}[] = [
  {
    stage: "LEARN",
    surface: "discovery",
    currentStateArea: "Discovery",
    keywords: [
      "discover",
      "crawl",
      "website",
      "brand profile",
      "learn the business",
      "analyze site",
    ],
  },
  {
    stage: "STRATEGIZE",
    surface: "strategy",
    currentStateArea: "Brand / Strategy / Content / Review / Calendar",
    keywords: ["strategy", "pillar", "this month", "talk about", "topics"],
  },
  {
    stage: "CONTENT_UNIVERSE",
    surface: "content",
    currentStateArea: "Brand / Strategy / Content / Review / Calendar",
    keywords: ["content universe", "carousel", "coordinated", "family of"],
  },
  {
    stage: "PRODUCE",
    surface: "content",
    currentStateArea: "Brand / Strategy / Content / Review / Calendar",
    keywords: ["produce", "generate asset", "caption", "render video"],
  },
  {
    stage: "REVIEW",
    surface: "review",
    currentStateArea: "Brand / Strategy / Content / Review / Calendar",
    keywords: ["review", "approve", "queue"],
  },
  {
    stage: "SCHEDULE",
    surface: "calendar",
    currentStateArea: "Brand / Strategy / Content / Review / Calendar",
    keywords: ["schedule", "calendar"],
  },
  {
    stage: "PUBLISH_LEARN",
    surface: "analytics",
    currentStateArea: "Publish + Learn (Analytics)",
    keywords: ["publish", "analytics", "performance", "what worked"],
  },
  {
    stage: "LANDING",
    surface: "landing",
    currentStateArea: "Landing",
    keywords: ["landing", "marketing site", "homepage hero"],
  },
  {
    stage: "ENGINEERING",
    surface: "engineering",
    currentStateArea: "Auth + Data",
    keywords: [
      "mcp",
      "drizzle",
      "auth",
      "database",
      "ci",
      "knowledge:",
      "typecheck",
      "eslint",
      "refactor",
      "typescript",
      "aps",
      "agent-prompt",
    ],
  },
];

/**
 * Recommendation only — agents may override with evidence.
 * Not an unquestionable router for product or engineering work.
 */
export async function mmStageForRequest(
  request: string
): Promise<ToolEnvelope<Record<string, unknown>>> {
  const product = await resolveProjectDoc("product");
  const q = request.toLowerCase();
  const scored = STAGE_HINTS.map((h) => ({
    ...h,
    score: h.keywords.reduce((n, k) => n + (q.includes(k) ? 1 : 0), 0),
  }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return ok(
      {
        recommendedStage: "UNCERTAIN",
        primaryStage: "UNCERTAIN",
        confidence: "low",
        owningSurface: null,
        currentStateArea: null,
        possibleSecondaryStage: null,
        secondaryStages: [],
        rationale: [
          "No strong keyword grounding; read CURRENT_STATE + PRODUCT manually. This is a recommendation, not a decision.",
        ],
        sourceSections: [
          "project-knowledge/PRODUCT.md#PRODUCT LOOP",
          "project-knowledge/CURRENT_STATE.md",
        ],
      },
      { uncertainty: "high", warnings: ["Could not ground request to a stage"] }
    );
  }

  const primary = scored[0];
  const secondary = scored.slice(1, 3).map((s) => s.stage);
  const cross = scored.filter((s) => s.score === primary.score).length > 1;
  const recommendedStage = cross ? "CROSS_STAGE" : primary.stage;

  return ok(
    {
      recommendedStage,
      primaryStage: recommendedStage,
      confidence: primary.score >= 2 ? "high" : "medium",
      owningSurface: primary.surface,
      currentStateArea: primary.currentStateArea,
      possibleSecondaryStage: secondary[0] ?? null,
      secondaryStages: cross
        ? scored.filter((s) => s.score === primary.score).map((s) => s.stage)
        : secondary,
      rationale: [
        `Recommendation (not a decision): grounded against PRODUCT.md loop + CURRENT_STATE areas using keywords matched in request (score=${primary.score}). Agents may override with evidence.`,
      ],
      sourceSections: [
        "project-knowledge/PRODUCT.md#PRODUCT LOOP",
        "project-knowledge/CURRENT_STATE.md",
      ],
      productHashHint: product.rel,
    },
    { uncertainty: primary.score >= 2 ? "low" : "medium" }
  );
}

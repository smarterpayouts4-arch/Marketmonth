import type { ContentBrainContext } from "@/brain/content/types";

import {
  COMPARISON_ATTR_RE,
  POSITIVE_INGREDIENT_TOKEN_RE,
} from "../subjects/ingredient-patterns";
import type { TopicSubject } from "../topic-subject";
import type { IndustryResearchOpportunity } from "./types";
import { filterValidIndustryOpportunities } from "./validate";

function clampLabel(text: string, max = 64): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Map validated industry opportunities → TopicSubjects for the sole generator.
 * Named ingredients become ingredient_or_component + industry_research —
 * never catalog_product.
 */
export function industryOpportunitiesToSubjects(
  opportunities: IndustryResearchOpportunity[],
  context: ContentBrainContext
): TopicSubject[] {
  const valid = filterValidIndustryOpportunities(opportunities, context);
  const out: TopicSubject[] = [];
  const seen = new Set<string>();

  for (const opp of valid) {
    const q = opp.educationalQuestion.trim();
    const ingredientMatch = q.match(POSITIVE_INGREDIENT_TOKEN_RE);
    const ingredient = ingredientMatch?.[1]?.trim();

    // Ingredient names only when present in approved industry evidence text
    if (ingredient) {
      const evidenceMentionsIngredient = opp.evidenceIds.some((id) => {
        const ev = context.evidenceById[id];
        if (!ev) return false;
        const blob = `${ev.value} ${ev.sourceSnippet}`.toLowerCase();
        return blob.includes(ingredient.toLowerCase());
      });
      // Also allow when the opportunity question itself is the approved evidence value
      const questionIsEvidence = opp.evidenceIds.some((id) => {
        const ev = context.evidenceById[id];
        return ev && ev.value.toLowerCase().includes(ingredient.toLowerCase());
      });
      if (evidenceMentionsIngredient || questionIsEvidence || q.toLowerCase().includes(ingredient.toLowerCase())) {
        const label = clampLabel(ingredient, 40);
        const key = `ingredient_or_component|${label.toLowerCase()}|industry`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({
            label,
            kind: "ingredient_or_component",
            sourceField: `industryResearch[${opp.opportunityId}]`,
            evidenceIds: [...opp.evidenceIds],
            classificationReason:
              "Named ingredient from approved industry_research evidence — not catalog_product",
            classificationConfidence:
              opp.confidence === "high" ? "medium" : "low",
            sourceType: "industry_research",
            supportFamilyKey: opp.sourceUrls[0] ?? opp.opportunityId,
          });
        }
      }
    }

    // Educational shopping question as comparison_attribute when attribute-like
    if (COMPARISON_ATTR_RE.test(q)) {
      const label = clampLabel(q, 72);
      const key = `comparison_attribute|${label.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({
          label,
          kind: "comparison_attribute",
          sourceField: `industryResearch[${opp.opportunityId}]`,
          evidenceIds: [...opp.evidenceIds],
          classificationReason:
            "Industry educational shopping question (industry_research provenance)",
          classificationConfidence: opp.confidence,
          sourceType: "industry_research",
          supportFamilyKey: opp.sourceUrls[0] ?? opp.opportunityId,
        });
      }
    }
  }

  return out;
}

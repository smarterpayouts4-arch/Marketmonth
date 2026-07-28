import { z } from "zod";

export const IDEA_QUALITY_DIMENSIONS = [
  "csv_relevance",
  "brand_alignment",
  "audience_relevance",
  "specificity",
  "originality",
  "usefulness",
  "distinctness",
  "evidence_grounding",
  "clarity",
  "would_create",
] as const;

export type IdeaQualityDimension = (typeof IDEA_QUALITY_DIMENSIONS)[number];

export const ideaDispositionSchema = z.enum(["keep", "maybe", "reject"]);

export const primaryWeaknessSchema = z.enum([
  "too_generic",
  "not_relevant_to_csv",
  "repetitive",
  "weak_hook",
  "weak_audience_fit",
  "unsupported_claim",
  "too_promotional",
  "not_actionable",
  "already_overused",
  "other",
]);

const score1to5 = z.number().int().min(1).max(5);

export const ideaQualityScoresSchema = z.object({
  csv_relevance: score1to5,
  brand_alignment: score1to5,
  audience_relevance: score1to5,
  specificity: score1to5,
  originality: score1to5,
  usefulness: score1to5,
  distinctness: score1to5,
  evidence_grounding: score1to5,
  clarity: score1to5,
  would_create: score1to5,
});

export const ideaHumanEvaluationSchema = z.object({
  ideaId: z.string().min(1),
  scores: ideaQualityScoresSchema,
  disposition: ideaDispositionSchema,
  primaryWeakness: primaryWeaknessSchema,
  notes: z.string().max(2000).optional(),
});

export const ideaLabRunEvaluationSchema = z.object({
  label: z.literal("Human evaluation for this run"),
  ideas: z.array(ideaHumanEvaluationSchema).max(6),
  selectedIdeaId: z.string().optional(),
  updatedAt: z.string().min(1),
});

export type IdeaDisposition = z.infer<typeof ideaDispositionSchema>;
export type PrimaryWeakness = z.infer<typeof primaryWeaknessSchema>;
export type IdeaQualityScores = z.infer<typeof ideaQualityScoresSchema>;
export type IdeaHumanEvaluation = z.infer<typeof ideaHumanEvaluationSchema>;
export type IdeaLabRunEvaluation = z.infer<typeof ideaLabRunEvaluationSchema>;

export function averageScores(scores: IdeaQualityScores): number {
  const vals = IDEA_QUALITY_DIMENSIONS.map((d) => scores[d]);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function overallAverage(
  ideas: IdeaHumanEvaluation[]
): number | null {
  if (ideas.length === 0) return null;
  return (
    ideas.reduce((sum, i) => sum + averageScores(i.scores), 0) / ideas.length
  );
}

export function bestIdeaId(
  ideas: IdeaHumanEvaluation[]
): string | null {
  if (ideas.length === 0) return null;
  let best = ideas[0];
  for (const idea of ideas.slice(1)) {
    if (averageScores(idea.scores) > averageScores(best.scores)) best = idea;
  }
  return best.ideaId;
}

export function lowestScoringDimension(
  ideas: IdeaHumanEvaluation[]
): IdeaQualityDimension | null {
  if (ideas.length === 0) return null;
  const totals: Record<IdeaQualityDimension, number> = {
    csv_relevance: 0,
    brand_alignment: 0,
    audience_relevance: 0,
    specificity: 0,
    originality: 0,
    usefulness: 0,
    distinctness: 0,
    evidence_grounding: 0,
    clarity: 0,
    would_create: 0,
  };
  for (const idea of ideas) {
    for (const d of IDEA_QUALITY_DIMENSIONS) {
      totals[d] += idea.scores[d];
    }
  }
  let lowest: IdeaQualityDimension = IDEA_QUALITY_DIMENSIONS[0];
  for (const d of IDEA_QUALITY_DIMENSIONS) {
    if (totals[d] < totals[lowest]) lowest = d;
  }
  return lowest;
}

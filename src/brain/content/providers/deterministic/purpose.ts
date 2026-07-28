import type { ObjectiveFramingStrategy } from "../../direction-writing-context";
import type { ContentAngle } from "../../types";
import { clamp } from "./text";

export function purposeFor(
  strategy: ObjectiveFramingStrategy,
  angle: ContentAngle
): string {
  const byStrategy: Record<ObjectiveFramingStrategy, string> = {
    education_process:
      "Teach process, terminology, and common mistakes for this subject.",
    value_differentiation:
      "Show the benefit, difference, and clearer outcome this solution enables.",
    awareness_positioning:
      "Introduce the category and position the brand for recognition.",
    decision_criteria:
      "Give evaluation criteria, trade-offs, and risks for a buying decision.",
    trust_credibility:
      "Establish what is proven, assumed, and off-limits with transparent proof.",
  };
  const angleTag: Record<ContentAngle, string> = {
    beginner_guide: "Starter path",
    faq: "Q&A unblocker",
    problem_solution: "Friction relief",
    decision_guide: "Checklist",
    comparison: "Fair contrast",
    trust_transparency: "Trust asset",
    how_it_works: "Mechanism",
    action_oriented: "Next step",
    other: "Other angle",
  };
  return clamp(`${angleTag[angle]} · ${byStrategy[strategy]}`, 150);
}

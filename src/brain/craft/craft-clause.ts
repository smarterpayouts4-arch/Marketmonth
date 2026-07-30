import { HOOKED_RULES } from "./hooked-playbook";
import { SHORT_FORM_RULES } from "./short-form-playbook";
import { STORYTELLING_RULES } from "./storytelling-playbook";
import { CRAFT_DNA_VERSION } from "./craft-version";

export type CraftStage =
  | "topic_title"
  | "direction_hook"
  | "atom"
  | "atom_polish"
  | "short_script"
  | "discovery_copy";

const PRECEDENCE = [
  "CRAFT PRECEDENCE (hard)",
  "- Evidence fidelity outranks style. If a craft move needs an unsupported fact, omit the move.",
  "- Create tension through unanswered questions, not invented information.",
  `- Craft DNA version: ${CRAFT_DNA_VERSION}`,
].join("\n");

/** Topic titles — validator-pre-conformed (24–90 chars, no ?, etc.). */
const TOPIC_TITLE_CLAUSE = [
  "TITLE CRAFT (validator-safe)",
  "- Declarative hooks ≥ 24 and ≤ 90 characters. No trailing '?' unless category is customer_questions.",
  "- Do not open with fragment patterns 'The …' or 'Is …' except 'The difference', 'The label', or 'The price'.",
  "- Lead with evidence-grounded nouns from cited lines. No numbers absent from cited evidence.",
  "- Put curiosity in optional 'hook' field; keep 'title' claim-safe and specific.",
  "- Story Lens: prefer a non-obvious evidence-backed angle over generic category framing.",
  "- Vary vocabulary across candidates so titles do not clone the same shell.",
].join("\n");

const DIRECTION_HOOK_CLAUSE = [
  "DIRECTION HOOK CRAFT",
  "- Punchline must open a curiosity gap with tension; keep under 90 characters.",
  "- Prefer contrast or recognition over dry lecture shells.",
  "- Payoff line (if any) must not invent facts — use allowedFacts only.",
].join("\n");

const DISCOVERY_COPY_CLAUSE = [
  "DISCOVERY DISPLAY CRAFT",
  "- Improve clarity, specificity, and readability only.",
  "- Paint a picture with concrete nouns already in the evidence detail.",
  "- Never invent facts, numbers, products, or social-performance claims.",
  "- Anti-generic: reject vague 'any business' wording.",
].join("\n");

/**
 * Compact craft block for a pipeline stage. Keep short — nano models degrade
 * under dense competing instructions.
 */
export function buildCraftClause(stage: CraftStage): string {
  switch (stage) {
    case "topic_title":
      return [TOPIC_TITLE_CLAUSE, SHORT_FORM_RULES.split("\n").slice(0, 3).join("\n"), PRECEDENCE].join(
        "\n\n"
      );
    case "direction_hook":
      return [DIRECTION_HOOK_CLAUSE, PRECEDENCE].join("\n\n");
    case "atom":
      return [HOOKED_RULES, STORYTELLING_RULES, PRECEDENCE].join("\n\n");
    case "atom_polish":
      return [
        "CRAFT POLISH PASS",
        "- Rewrite prose for Hook Model + storytelling power WITHOUT changing facts.",
        "- Preserve every evidence_id and claimRuleId exactly.",
        "- Do not add numbers, product names, studies, or medical claims.",
        "- Strengthen planted_question tension, climax insight, and complete intended_action.",
        "- Brand appears only as a closing bridge in ctaIntent for educational topics — not in hook fields.",
        HOOKED_RULES,
        STORYTELLING_RULES,
        SHORT_FORM_RULES,
        PRECEDENCE,
      ].join("\n\n");
    case "short_script":
      return [SHORT_FORM_RULES, HOOKED_RULES, PRECEDENCE].join("\n\n");
    case "discovery_copy":
      return [DISCOVERY_COPY_CLAUSE, PRECEDENCE].join("\n\n");
    default:
      return PRECEDENCE;
  }
}

export { CRAFT_DNA_VERSION };

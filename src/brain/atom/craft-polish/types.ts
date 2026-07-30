export const ATOM_CRAFT_POLISH_VERSION = "atom-craft-polish-v1" as const;

export type CraftPolishProseFields = {
  audience_problem: string;
  why_problem_exists: string;
  core_tension: string;
  central_claim: string;
  planted_question: string;
  opening_intent: string;
  hook_resolution: string;
  resolution: string;
  payoff: string;
  intended_action: string;
  framework?: string[];
  steps?: string[];
  comparison_criteria?: string[];
  ctaIntent?: string;
};

export type CraftPolishResult = {
  polishVersion: typeof ATOM_CRAFT_POLISH_VERSION;
  fields: CraftPolishProseFields;
};

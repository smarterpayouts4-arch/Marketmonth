/** User-facing Marketing Topic workspace copy (single source). */

export const MARKETING_TOPIC_NAV_LABEL = "Marketing Topic";

export const MARKETING_TOPIC_HEADING = "Let's create your first marketing topic";

/** Must never appear as the primary heading. */
export const LEGACY_MARKETING_TOPIC_HEADING = "Create your social media month";

/** Superseded “pick” framing — keep for debt checks only. */
export const LEGACY_PICK_HEADING = "Pick your first marketing topic";

export const TOPIC_CARD_LABEL = "Your topic";

export const TOPIC_INPUT_PLACEHOLDER =
  "Type a topic, campaign idea, or customer question…";

/** Uses the topic the user typed. */
export const GENERATE_BUTTON_LABEL = "Generate";

/** Invents a topic from brand context when the field is empty. */
export const AUTO_GENERATE_BUTTON_LABEL = "Auto-generate";

/** Clears ephemeral Marketing Topic session only — not Brand Core or history. */
export const START_OVER_BUTTON_LABEL = "Start over";

/** Keeps master topic; creates a new directions set + history record. */
export const REGENERATE_IDEAS_BUTTON_LABEL = "Regenerate ideas";

export const TOPIC_CATEGORY_LEGEND =
  "What do you want this topic to accomplish?";

export const CONTEXT_TRIGGER_LABEL = "Add helpful context";

export const CONTEXT_HELP_MICROCOPY =
  "Relevant context helps us create more specific directions.";

export const CONTEXT_PANEL_TITLE = "Add helpful context";

export const CONTEXT_PANEL_INTRO =
  "Share notes, source material, campaign details, or a file.";

export const CONTEXT_HELPFUL_LINE =
  "Helpful context makes each direction more specific to your goal.";

export const CONTEXT_EXAMPLES = [
  "The offer you want to highlight",
  "A customer question",
  "A key message or campaign goal",
  "Notes or source material",
] as const;

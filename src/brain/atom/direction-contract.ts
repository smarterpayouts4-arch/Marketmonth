import type { SelectedTopicContext } from "@/brain/content/direction-writing-context";
import type { TopicCategoryId } from "@/brain/content/topic-category";
import type {
  ContentAngle,
  ContentVariation,
  MasterTopic,
} from "@/brain/content/types";

export type DirectionRequiredElement =
  | "audience_problem"
  | "cause"
  | "consequence"
  | "resolution"
  | "belief_shift"
  | "questions"
  | "decision_criteria"
  | "comparison_axes"
  | "trust_boundaries"
  | "first_step"
  | "action";

export type SelectedDirectionContract = {
  directionId: string;
  angle: ContentAngle;
  /** Brief maps this to "headline". */
  masterTitle: string;
  topicId?: string;
  grounding?: "candidate" | "user_typed";
  /** Brief maps this to "requiredNarrativeElements". */
  requiredElements: DirectionRequiredElement[];
  prohibitedDrift: string[];
  evidenceRequirements: {
    minUsable: number;
    preferIds: string[];
  };
  /** Human-readable requirements for the constrained LLM prompt. */
  requirementsText: string;
  variation: ContentVariation;
  selectedTopicContext?: SelectedTopicContext;
  /** Selected marketing-topic job (trust_proof, etc.). */
  topicCategory?: TopicCategoryId;
  /** Strategic freeze fields (brief SelectedDirectionContract). */
  audienceTension: string;
  questionAnswered: string;
  thesisHypothesis: string;
  intendedPayoff: string;
  sourceDirectionVersion: string;
  createdAt: string;
};

const ANGLE_ELEMENTS: Record<ContentAngle, DirectionRequiredElement[]> = {
  problem_solution: [
    "audience_problem",
    "cause",
    "consequence",
    "resolution",
    "belief_shift",
  ],
  faq: ["questions", "audience_problem", "resolution"],
  beginner_guide: ["first_step", "audience_problem", "resolution"],
  decision_guide: ["decision_criteria", "audience_problem", "belief_shift"],
  comparison: ["comparison_axes", "audience_problem", "resolution"],
  trust_transparency: ["trust_boundaries", "audience_problem", "belief_shift"],
  how_it_works: ["first_step", "resolution", "audience_problem"],
  action_oriented: ["action", "audience_problem", "resolution"],
  other: ["audience_problem", "resolution", "belief_shift"],
};

const ANGLE_REQUIREMENTS_TEXT: Record<ContentAngle, string> = {
  problem_solution:
    "Name the audience problem, why it exists (cause), what it costs them (consequence), the resolution, and the belief shift.",
  faq: "Stay question-led: surface the practical questions that stall action, answer them honestly, and resolve the decision block. No generic product tour.",
  beginner_guide:
    "Give one concrete first step for newcomers; name what to ignore early; avoid a full category survey.",
  decision_guide:
    "Provide decision criteria the audience can use; clarify tradeoffs; drive a belief shift toward a clearer choice.",
  comparison:
    "Name explicit comparison axes; stay fair; resolve which path fits which situation without invented superiority claims.",
  trust_transparency:
    "State trust boundaries: what is proven, assumed, and off-limits. Drive a belief shift toward earned credibility.",
  how_it_works:
    "Explain the mechanism in ordered steps; keep one clear resolution; no channel formatting.",
  action_oriented:
    "Name the intended action and the smallest next move; connect action to the audience problem.",
  other:
    "Name the audience problem, a concrete resolution, and a specific belief shift for this topic.",
};

const SHARED_PROHIBITED = [
  "platform captions or durations",
  "channel-specific formatting",
  "invented evidence IDs",
  "generic marketing prose that could apply to any brand",
  "hollow template belief shifts about content volume",
];

export const DIRECTION_CONTRACT_VERSION = "direction-contract-v1" as const;

/**
 * Freeze the selected variation + topic context into a per-angle contract.
 */
export function buildSelectedDirectionContract(input: {
  masterTopic: MasterTopic;
  variation: ContentVariation;
  selectedTopicContext?: SelectedTopicContext;
  topicCategory?: TopicCategoryId;
  now?: Date;
}): SelectedDirectionContract {
  const { masterTopic, variation, selectedTopicContext } = input;
  const topicCategory =
    input.topicCategory ?? selectedTopicContext?.objective;
  const angle = variation.angle;
  const requiredElements = ANGLE_ELEMENTS[angle] ?? ANGLE_ELEMENTS.other;
  const preferIds = uniqueStrings([
    ...(selectedTopicContext?.evidenceIds ?? []),
    ...variation.evidenceIds,
    ...masterTopic.evidenceIds,
  ]);

  const masterTitle =
    selectedTopicContext?.masterTitle?.trim() || masterTopic.punchline;
  const audienceTension =
    variation.audienceProblem?.trim() ||
    selectedTopicContext?.audiencePain?.trim() ||
    `Unclear next step around ${masterTitle}`;
  const questionAnswered =
    angle === "faq"
      ? variation.punchline
      : `What should ${selectedTopicContext?.audience?.trim() || "the audience"} do about ${masterTitle}?`;
  const thesisHypothesis = variation.brief?.trim() || variation.punchline;
  const intendedPayoff =
    variation.corePromise?.trim() ||
    variation.strategicPurpose?.trim() ||
    `A clearer decision on ${masterTitle}`;

  return {
    directionId: variation.id,
    angle,
    masterTitle,
    topicId: selectedTopicContext?.topicId ?? masterTopic.id,
    grounding: selectedTopicContext?.grounding,
    requiredElements,
    prohibitedDrift: [
      ...SHARED_PROHIBITED,
      `drift away from angle ${angle}`,
      `replace master topic "${masterTitle}"`,
    ],
    evidenceRequirements: {
      minUsable: angle === "faq" || angle === "trust_transparency" ? 1 : 2,
      preferIds,
    },
    requirementsText:
      ANGLE_REQUIREMENTS_TEXT[angle] ?? ANGLE_REQUIREMENTS_TEXT.other,
    variation,
    selectedTopicContext,
    topicCategory,
    audienceTension,
    questionAnswered,
    thesisHypothesis,
    intendedPayoff,
    sourceDirectionVersion: DIRECTION_CONTRACT_VERSION,
    createdAt: (input.now ?? new Date()).toISOString(),
  };
}

function uniqueStrings(ids: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const t = id.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

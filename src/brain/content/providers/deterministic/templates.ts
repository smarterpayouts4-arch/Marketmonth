import type { DirectionWritingContext } from "../../direction-writing-context";
import { shortHash } from "../../evidence";
import type { MarketingFocus } from "../../marketing-focus";
import { evaluateSafety, mergeSafety } from "../../safety";
import type {
  ContentAngle,
  ContentBrainContext,
  ContentVariation,
  MasterTopic,
} from "../../types";
import { purposeFor } from "./purpose";
import { clamp, padSummary } from "./text";

const ANGLE_SEQUENCE: ContentAngle[] = [
  "beginner_guide",
  "faq",
  "problem_solution",
  "decision_guide",
  "comparison",
  "trust_transparency",
];

export function buildSixVariations(input: {
  context: ContentBrainContext;
  masterTopic: MasterTopic;
  writing: DirectionWritingContext;
  marketingFocus?: MarketingFocus;
}): [
  ContentVariation,
  ContentVariation,
  ContentVariation,
  ContentVariation,
  ContentVariation,
  ContentVariation,
] {
  const { context, masterTopic, writing } = input;
  const brand = context.brandName;
  const subject = writing.topicSubject;
  const audience = writing.audienceLabel.value;
  const offer = writing.offerLabel.value;
  const pain =
    writing.audiencePain?.value ||
    `unclear next steps around ${subject}`;
  const promise =
    writing.valuePromise?.value ||
    `${brand} helps with ${offer}`;
  const evidenceIds = Object.keys(context.evidenceById).slice(0, 3);
  const strategy = writing.framingStrategy;

  type Template = {
    angle: ContentAngle;
    punchline: string;
    subheading: string;
    brief: string;
    ideaSummary: string;
    audienceProblem: string;
    strategicPurpose: string;
    suggestedCta: string;
    specificTopic: string;
    corePromise: string;
    suggestedFormat: string;
  };

  const templates: Template[] = [
    {
      angle: "beginner_guide",
      punchline: clamp(`A practical starting guide to ${subject}`, 90),
      specificTopic: clamp(
        `First steps for ${audience} new to ${subject}`,
        160
      ),
      subheading: clamp(
        `Orient newcomers with one concrete starting move around ${offer}.`,
        150
      ),
      brief: clamp(
        `Beginner path for ${subject}: what to learn first, what to ignore early.`,
        280
      ),
      ideaSummary: padSummary(
        `${audience} often stall when first approaching ${subject}. This beginner guide gives one concrete starting decision using ${brand}'s ${offer}. It names what to ignore early and what matters before investing more time. The payoff is a reusable first step under the selected master topic — not a full category tour.`
      ),
      audienceProblem: clamp(
        `${audience} lack a clear first step for ${subject}.`,
        150
      ),
      strategicPurpose: purposeFor(strategy, "beginner_guide"),
      corePromise: clamp(`Leave with one clear first step on ${subject}`, 280),
      suggestedFormat: "narrative_explainer",
      suggestedCta: "See the first step",
    },
    {
      angle: "faq",
      punchline: clamp(
        `Questions ${audience} ask before trusting ${offer}`,
        90
      ),
      specificTopic: clamp(
        `Practical questions about ${subject} before acting`,
        160
      ),
      subheading: "Answer the objections that stall commitment.",
      brief: clamp(
        `FAQ on ${subject}: specific questions, honest limits, grounded in ${brand}.`,
        280
      ),
      ideaSummary: padSummary(
        `People researching ${subject} get stuck on the same practical questions before they trust a next step. This FAQ answers those questions in ${brand}'s voice, using known context about ${offer} without inventing unsupported claims. It separates what is proven from what is still a judgment call. The card should feel like a decision unblocker, not a glossary.`
      ),
      audienceProblem: clamp(
        `Uncertainty about ${subject} delays action for ${audience}.`,
        150
      ),
      strategicPurpose: purposeFor(strategy, "faq"),
      corePromise: "Unblock the decision with honest, specific answers",
      suggestedFormat: "q_and_a",
      suggestedCta: "Get answers",
    },
    {
      angle: "problem_solution",
      punchline: clamp(
        `Why ${subject} feels hard — and a clearer path`,
        90
      ),
      specificTopic: clamp(
        `The friction behind ${subject} and how ${brand} organizes next moves`,
        160
      ),
      subheading: clamp(
        `Name the pain (${clamp(pain, 40)}), then show a clearer path.`,
        150
      ),
      brief: clamp(
        `Problem → relief for ${subject}, grounded in ${brand}'s offer (${offer}).`,
        280
      ),
      ideaSummary: padSummary(
        `Scattered advice makes ${subject} feel harder than it should for ${audience}. This idea names that friction in their language, then shows how ${brand} organizes a clearer path through ${offer}. It stays concrete: one problem, one organized next move, and proof language tied to known context (${promise}). Do not expand into a full product tour.`
      ),
      audienceProblem: clamp(
        `Scattered advice about ${subject} wastes attention.`,
        150
      ),
      strategicPurpose: purposeFor(strategy, "problem_solution"),
      corePromise: "Replace scatter with one coherent next move",
      suggestedFormat: "before_after",
      suggestedCta: "Start with clarity",
    },
    {
      angle: "decision_guide",
      punchline: clamp(
        `Five checks before relying on ${offer}`,
        90
      ),
      specificTopic: clamp(
        `A short checklist for evaluating ${subject}`,
        160
      ),
      subheading: "A reusable decision checklist for this topic.",
      brief: clamp(
        `Decision checklist for ${subject}: criteria and where ${offer} fits.`,
        280
      ),
      ideaSummary: padSummary(
        `Buyers comparing options around ${subject} need shared criteria, not more opinions. This checklist is tied to ${brand}'s positioning and ${offer}, so decisions can be repeated. Each check should be evaluable without inventing metrics beyond known context. The promise is a reusable decision tool under the master topic, not a one-off tip.`
      ),
      audienceProblem: clamp(
        `Buyers lack a shared checklist for ${subject}.`,
        150
      ),
      strategicPurpose: purposeFor(strategy, "decision_guide"),
      corePromise: "Walk away with criteria you can reuse",
      suggestedFormat: "checklist",
      suggestedCta: "Use the checklist",
    },
    {
      angle: "comparison",
      punchline: clamp(
        `What matters when comparing ${offer}`,
        90
      ),
      specificTopic: clamp(
        `Side-by-side dimensions for ${subject} (no rival trash-talk)`,
        160
      ),
      subheading: "Contrast approaches on criteria that change outcomes.",
      brief: clamp(
        `Comparison under ${subject}: dimensions that matter for ${audience}.`,
        280
      ),
      ideaSummary: padSummary(
        `Side-by-side evaluation around ${subject} feels opaque when every option claims the same benefits. This idea defines the few dimensions that change outcomes for ${audience}, grounded in ${brand} context and ${offer}. It avoids trash-talking rivals and stays within what is supportable from known proof. The result is a fair comparison frame buyers can reuse when shortlisting.`
      ),
      audienceProblem: clamp(
        `Side-by-side evaluation of ${subject} feels opaque.`,
        150
      ),
      strategicPurpose: purposeFor(strategy, "comparison"),
      corePromise: "Compare approaches on criteria that actually matter",
      suggestedFormat: "side_by_side",
      suggestedCta: "Compare approaches",
    },
    {
      angle: "trust_transparency",
      punchline: clamp(
        `What ${brand} will and will not claim about ${subject}`,
        90
      ),
      specificTopic: clamp(
        `Proven vs assumed vs off-limits for ${subject}`,
        160
      ),
      subheading: "Show receipts and honest limits before the ask.",
      brief: clamp(
        `Trust direction on ${subject}: known context, assumptions, and ${brand} limits.`,
        280
      ),
      ideaSummary: padSummary(
        `Skepticism about ${subject} is rational when claims outrun evidence. This idea shows what ${brand} can support from known context (${promise}), what remains an assumption, and what stays off-limits. It builds credibility for ${audience} before any conversion ask related to ${offer}. Keep the tone transparent and specific — a trust asset under the master topic, not a soft brand anthem.`
      ),
      audienceProblem: clamp(
        `Skepticism about ${subject} blocks engagement.`,
        150
      ),
      strategicPurpose: purposeFor(strategy, "trust_transparency"),
      corePromise: "See what is proven, assumed, and off-limits",
      suggestedFormat: "case_narrative",
      suggestedCta: "Learn more",
    },
  ];

  const variations = templates.map((t, index) =>
    toVariation({
      template: t,
      index,
      masterTopic,
      context,
      evidenceIds,
      destination: context.website,
    })
  ) as [
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
  ];

  for (let i = 0; i < ANGLE_SEQUENCE.length; i++) {
    variations[i] = { ...variations[i], angle: ANGLE_SEQUENCE[i] };
  }

  return variations;
}

function toVariation(args: {
  template: {
    angle: ContentAngle;
    punchline: string;
    subheading: string;
    brief: string;
    ideaSummary: string;
    audienceProblem: string;
    strategicPurpose: string;
    suggestedCta: string;
    specificTopic: string;
    corePromise: string;
    suggestedFormat: string;
  };
  index: number;
  masterTopic: MasterTopic;
  context: ContentBrainContext;
  evidenceIds: string[];
  destination: string;
}): ContentVariation {
  const { template, index, masterTopic, context, evidenceIds, destination } =
    args;
  const punchline = clamp(template.punchline, 90);
  const subheading = clamp(template.subheading, 150);
  const brief = clamp(template.brief, 280);
  const ideaSummary = padSummary(template.ideaSummary);
  const specificTopic = clamp(template.specificTopic, 160);
  const corePromise = clamp(template.corePromise, 280);
  const safety = mergeSafety(
    evaluateSafety(punchline),
    evaluateSafety(subheading),
    evaluateSafety(brief),
    evaluateSafety(ideaSummary),
    evaluateSafety(specificTopic),
    masterTopic.safety
  );

  return {
    id: `var_${shortHash(
      `${masterTopic.id}|${template.angle}|${index}|${context.contextVersion}`
    )}`,
    angle: template.angle,
    punchline,
    subheading,
    brief,
    ideaSummary,
    audienceProblem: clamp(template.audienceProblem, 150),
    strategicPurpose: clamp(template.strategicPurpose, 150),
    specificTopic,
    corePromise,
    suggestedFormat: template.suggestedFormat,
    suggestedCta: template.suggestedCta,
    destination,
    evidenceIds,
    assumptionIds: ["asm_public_positioning"],
    confidence: evidenceIds.length >= 2 ? "medium" : "low",
    safety,
  };
}


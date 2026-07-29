/**
 * Card-faithful view of the discovery narrative.
 *
 * Mirrors what `DiscoveryResults` actually renders (via `toDiscoveryActivation`),
 * not raw engine output. `preview-discovery-narrative.ts` prints engine fields the
 * card never shows (subheading / socialMeaning / reveal) and omits the ones it does
 * (question, evidence rows, takeaway, insight suppression).
 *
 * Hand-mirrored: update this when the card's field selection changes.
 */
import {
  REVEAL_LABELS,
  REVEAL_ORDER,
  shouldSuppressInsight,
  toDiscoveryActivation,
} from "../../src/components/discovery/activation";
import type { SocialDiscoveryProfile } from "../../src/lib/discovery/discovery-narrative.schema";

export type CardEvidenceRow = {
  id: string;
  title: string;
  summary: string;
  tag?: string;
  detail: string;
  supportingPoints: string[];
  sourceLabel: string;
  kind: string;
};

export type CardTab = {
  id: string;
  label: string;
  position: string;
  question: string;
  insight?: string;
  insightSuppressed: boolean;
  clarification?: string;
  rows: CardEvidenceRow[];
  takeaway?: string;
  transition?: string;
};

export type CardView = {
  businessName: string;
  evidenceQuality: string;
  introHeadline: string;
  introDescription: string;
  tabs: CardTab[];
  contentPlay: {
    pillars: { name: string; description: string }[];
    adaptations: { platform: string; status: string; guidance: string }[];
    cadenceLabel: string;
    cadenceDescription: string;
    coreTopic: string;
    strategicPurpose: string;
    pieces: { day: string; platform: string; format: string; hook: string }[];
    finalDirection: string;
    investmentQuestion: string;
  };
};

export function toCardView(narrative: SocialDiscoveryProfile): CardView {
  const activation = toDiscoveryActivation(narrative, {
    businessName: narrative.businessName,
  });

  const tabs: CardTab[] = REVEAL_ORDER.map((id, index) => {
    const reveal = activation.reveals[index]!;
    // Same suppression decision the card makes.
    const firstObserved = reveal.evidence.find(
      (e) => e.kind === "observed"
    )?.text;
    const suppressed =
      !reveal.insight.trim() ||
      shouldSuppressInsight(reveal.insight, firstObserved);

    return {
      id,
      label: REVEAL_LABELS[id],
      position: `YOUR DISCOVERY · ${index + 1} OF 3`,
      question: reveal.question,
      insight: suppressed ? undefined : reveal.insight,
      insightSuppressed: suppressed,
      clarification: reveal.clarification,
      rows: reveal.evidenceItems.map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        tag: item.tag,
        detail: item.detail,
        supportingPoints: item.supportingPoints,
        sourceLabel: item.sourceLabel,
        kind: item.kind,
      })),
      takeaway: reveal.takeaway,
      transition: id === "content-play" ? undefined : reveal.transition,
    };
  });

  const universe = narrative.contentUniversePreview;

  return {
    businessName: narrative.businessName,
    evidenceQuality: narrative.evidenceQuality,
    introHeadline: activation.introHeadline,
    introDescription: activation.introDescription,
    tabs,
    contentPlay: {
      pillars: narrative.contentPillars.map((p) => ({
        name: p.name,
        description: p.description,
      })),
      adaptations: narrative.platformAdaptations.map((a) => ({
        platform: a.platform,
        status: a.status,
        guidance: a.guidance,
      })),
      cadenceLabel: narrative.cadence.label,
      cadenceDescription: narrative.cadence.description,
      coreTopic: universe.coreTopic,
      strategicPurpose: universe.strategicPurpose,
      pieces: universe.pieces.slice(0, 6).map((piece) => ({
        day: `Day+${piece.dayOffset}`,
        platform: piece.platform,
        format: piece.format,
        hook: piece.hook,
      })),
      finalDirection: narrative.finalDirection,
      investmentQuestion: narrative.investmentQuestion,
    },
  };
}

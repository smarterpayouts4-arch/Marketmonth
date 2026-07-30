import { evaluateSafety, mergeSafety } from "../safety";
import type { SelectedTopicContext } from "../direction-writing-context";
import { evaluateAndExpandUserTopic } from "../expand-user-topic";
import { shortHash } from "../evidence";
import type { DirectionProviderId } from "../providers/types";
import type {
  ContentBrainContext,
  GenerateContentDirectionsInput,
  MasterTopic,
} from "../types";
import type { TopicCategoryId } from "../topic-category";
import { blockedProvenance } from "./provenance";
import type { GenerateContentDirectionsBundle } from "./types";
import { buildAutomaticMasterFromCandidates } from "./build-automatic-master-from-candidates";

export type MasterTopicStageResult =
  | { ok: true; masterTopic: MasterTopic; extraWarnings: string[] }
  | { ok: false; bundle: GenerateContentDirectionsBundle };

function confidenceFromEvidenceCount(
  n: number
): MasterTopic["confidence"] {
  if (n >= 3) return "high";
  if (n >= 1) return "medium";
  return "low";
}

export function buildMasterTopicStage(input: {
  context: ContentBrainContext;
  mode: GenerateContentDirectionsInput["mode"];
  providerId: DirectionProviderId;
  selectedTopicContext?: SelectedTopicContext;
  lockedMasterTopic?: string;
  topic?: string;
  recentMasterTopics?: string[];
  topicCategory?: TopicCategoryId;
  warnings: string[];
}): MasterTopicStageResult {
  const {
    context,
    mode,
    providerId,
    selectedTopicContext,
    lockedMasterTopic,
    topic,
    recentMasterTopics,
    topicCategory,
    warnings,
  } = input;

  if (selectedTopicContext) {
    if (!selectedTopicContext.masterTitle.trim()) {
      return {
        ok: false,
        bundle: {
          result: {
            status: "blocked",
            brandName: context.brandName,
            mode,
            missingFields: ["topic"],
            warnings: [...warnings, "Master title is required"],
            variations: [],
          },
          provenance: blockedProvenance(providerId, null),
        },
      };
    }

    const exact = selectedTopicContext.masterTitle;
    const safety = mergeSafety(evaluateSafety(exact));
    if (safety.status === "blocked") {
      return {
        ok: false,
        bundle: {
          result: {
            status: "blocked",
            brandName: context.brandName,
            mode,
            missingFields: [],
            warnings: [...warnings, "Topic failed safety checks"],
            variations: [],
          },
          provenance: blockedProvenance(providerId, null),
        },
      };
    }

    // Prefer the selected candidate's own evidence, then widen with
    // proof-aligned IDs (never brand-profile keys like businessName/logoUrl).
    const fromCandidate = (selectedTopicContext.evidenceIds ?? []).filter(
      (id) => Boolean(context.evidenceById[id] || id)
    );
    const PROFILE_KEYS = new Set([
      "businessName",
      "description",
      "logoUrl",
      "website",
      "domain",
      "brandName",
      "valueProposition",
      "tagline",
      "email",
      "phone",
      "address",
    ]);
    const proofAligned = Object.keys(context.evidenceById).filter((id) => {
      if (PROFILE_KEYS.has(id)) return false;
      const ev = context.evidenceById[id];
      const value = (ev?.value ?? "").toString().trim();
      if (value.length < 24) return false;
      if (/^https?:\/\//i.test(value)) return false;
      return true;
    });
    const widened = [
      ...fromCandidate,
      ...proofAligned.filter((id) => !fromCandidate.includes(id)),
    ].slice(0, 6);
    const evidenceIds =
      widened.length > 0
        ? widened
        : Object.keys(context.evidenceById)
            .filter((id) => !PROFILE_KEYS.has(id))
            .slice(0, 3);

    return {
      ok: true,
      extraWarnings:
        fromCandidate.length === 0
          ? [
              "Selected topic had no evidenceIds; fell back to context evidence sample.",
            ]
          : [],
      masterTopic: {
        id: `master_${shortHash(`selected|${exact}|${context.contextVersion}`)}`,
        source: "manual",
        punchline: exact,
        subheading:
          context.valueProposition?.trim() ||
          context.description?.trim() ||
          `Directions under the selected topic for ${context.brandName}`,
        rationale: `Owner-selected master topic (structured handoff). Six directions explore this umbrella without replacing it.`,
        evidenceIds,
        confidence: confidenceFromEvidenceCount(evidenceIds.length),
        safety,
      },
    };
  }

  const locked = lockedMasterTopic?.trim();
  if (locked) {
    const expanded = evaluateAndExpandUserTopic({
      topic: locked,
      context,
    });
    if (!expanded.ok) {
      return {
        ok: false,
        bundle: {
          result: {
            status: "blocked",
            brandName: context.brandName,
            mode,
            missingFields: expanded.missingFields,
            warnings: [...warnings, ...expanded.warnings],
            variations: [],
          },
          provenance: blockedProvenance(providerId, null),
        },
      };
    }
    return {
      ok: true,
      extraWarnings: expanded.warnings,
      masterTopic: {
        ...expanded.masterTopic,
        source: mode === "automatic" ? "automatic" : "manual",
        punchline: locked.slice(0, 90),
      },
    };
  }

  if (mode === "manual") {
    const expanded = evaluateAndExpandUserTopic({
      topic: topic ?? "",
      context,
    });
    if (!expanded.ok) {
      return {
        ok: false,
        bundle: {
          result: {
            status: "blocked",
            brandName: context.brandName,
            mode,
            missingFields: expanded.missingFields,
            warnings: [...warnings, ...expanded.warnings],
            variations: [],
          },
          provenance: blockedProvenance(providerId, null),
        },
      };
    }
    return {
      ok: true,
      extraWarnings: expanded.warnings,
      masterTopic: expanded.masterTopic,
    };
  }

  const masterTopic = buildAutomaticMasterFromCandidates(
    context,
    recentMasterTopics ?? [],
    topicCategory ?? "product_education"
  );
  if (!masterTopic) {
    return {
      ok: false,
      bundle: {
        result: {
          status: "blocked",
          brandName: context.brandName,
          mode,
          missingFields: ["topic"],
          warnings: [
            ...warnings,
            "Not enough grounded subjects to auto-generate a master topic. Add catalog evidence or enter a topic manually.",
          ],
          variations: [],
        },
        provenance: blockedProvenance(providerId, null),
      },
    };
  }
  if (masterTopic.safety.status === "blocked") {
    return {
      ok: false,
      bundle: {
        result: {
          status: "blocked",
          brandName: context.brandName,
          mode,
          missingFields: [],
          warnings: [
            ...warnings,
            "Automatic master topic failed safety checks",
            ...masterTopic.safety.reasons,
          ],
          variations: [],
        },
        provenance: blockedProvenance(providerId, null),
      },
    };
  }

  return {
    ok: true,
    extraWarnings: [],
    masterTopic,
  };
}

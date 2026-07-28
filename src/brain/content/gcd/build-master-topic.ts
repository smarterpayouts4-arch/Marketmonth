import { buildAutomaticMaster } from "../providers/deterministic-provider";
import { evaluateSafety, mergeSafety } from "../safety";
import type { SelectedTopicContext } from "../direction-writing-context";
import { evaluateAndExpandUserTopic } from "../expand-user-topic";
import { shortHash } from "../evidence";
import type { DirectionProviderId } from "../providers/types";
import type { ContentBrainContext, GenerateContentDirectionsInput, MasterTopic } from "../types";
import { blockedProvenance } from "./provenance";
import type { GenerateContentDirectionsBundle } from "./types";

export type MasterTopicStageResult =
  | { ok: true; masterTopic: MasterTopic; extraWarnings: string[] }
  | { ok: false; bundle: GenerateContentDirectionsBundle };

export function buildMasterTopicStage(input: {
  context: ContentBrainContext;
  mode: GenerateContentDirectionsInput["mode"];
  providerId: DirectionProviderId;
  selectedTopicContext?: SelectedTopicContext;
  lockedMasterTopic?: string;
  topic?: string;
  recentMasterTopics?: string[];
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

    const evidenceIds = Object.keys(context.evidenceById).slice(0, 3);
    return {
      ok: true,
      extraWarnings: [],
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
        confidence: "high",
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

  const masterTopic = buildAutomaticMaster(context, recentMasterTopics ?? []);
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

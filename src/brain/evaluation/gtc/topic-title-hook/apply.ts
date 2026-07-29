import type { FramedCandidate } from "../frame-title";

import { deterministicHookedTitle } from "./templates";
import type { TopicTitleHookResult } from "./types";
import { TOPIC_TITLE_HOOK_VERSION } from "./types";
import { validateHookedTitle } from "./validate";

export type FramedCandidateWithTitleHook = FramedCandidate & {
  titleHook: TopicTitleHookResult;
};

function resolveProvider(): "off" | "deterministic-v1" {
  const flag = process.env.TOPIC_TITLE_HOOK_PROVIDER?.trim().toLowerCase();
  if (flag === "off" || flag === "none") return "off";
  return "deterministic-v1";
}

/**
 * Hooked Trigger stage: rewrite educational frames into scroll-stopping titles.
 * Support keys stay seed-based (caller must not key off title).
 */
export function applyTopicTitleHooks(
  drafts: FramedCandidate[]
): FramedCandidateWithTitleHook[] {
  const provider = resolveProvider();

  if (provider === "off") {
    return drafts.map((draft) => ({
      ...draft,
      titleHook: {
        title: draft.title,
        itchType: "passthrough" as const,
        providerUsed: "deterministic-v1" as const,
        titleHookVersion: TOPIC_TITLE_HOOK_VERSION,
        fellBack: false,
      },
    }));
  }

  const usedTitles = new Set<string>();

  return drafts.map((draft, index) => {
    const framedTitle = draft.title;
    const hooked = deterministicHookedTitle(
      draft.seed,
      framedTitle,
      index,
      usedTitles,
      draft.objective
    );
    const check = validateHookedTitle({
      seed: draft.seed,
      framedTitle,
      hookedTitle: hooked.title,
    });

    if (!check.ok || hooked.itchType === "passthrough") {
      const kept = framedTitle;
      usedTitles.add(kept.toLowerCase());
      return {
        ...draft,
        titleHook: {
          title: kept,
          itchType: "passthrough",
          providerUsed: "deterministic-v1",
          titleHookVersion: TOPIC_TITLE_HOOK_VERSION,
          fellBack: !check.ok || hooked.itchType === "passthrough",
        },
      };
    }

    usedTitles.add(hooked.title.toLowerCase());
    return {
      ...draft,
      title: hooked.title,
      titleHook: {
        title: hooked.title,
        itchType: hooked.itchType,
        providerUsed: "deterministic-v1",
        titleHookVersion: TOPIC_TITLE_HOOK_VERSION,
        fellBack: false,
      },
      relevanceReasons: [
        ...draft.relevanceReasons.slice(0, 2),
        `Hooked trigger: ${hooked.itchType}`,
      ],
    };
  });
}

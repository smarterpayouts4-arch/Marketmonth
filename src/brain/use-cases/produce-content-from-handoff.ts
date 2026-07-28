import type { ContentAtom } from "@/brain/atom";
import { channelRegistry, type ChannelKey } from "@/brain/channels/channel-registry";
import {
  generateYouTubeShortPackage,
  youtubeShortToStudioPackage,
  type YouTubeShortPackage,
} from "@/brain/channels/youtube-short";
import type { ContentDirectionsHandoffV1 } from "@/brain/content/types";
import type { BrandCore } from "@/brain/core";
import { runCoreContentBrain } from "@/brain/pipeline";
import { PRODUCT_ATOM_PREFER_LLM } from "@/brain/policy/provider-policy";
import { saveAtomRecord, savePackageRecord } from "@/brain/store";

import { loadBrandContextForAtom } from "./load-brand-context-for-atom";

const CHANNEL_KEY_BY_SPECIALIST: Record<string, ChannelKey> = {
  "youtube-short": "youtubeShort",
  youtube_short: "youtubeShort",
  youtubeShort: "youtubeShort",
};

export type ProduceContentFromHandoffInput = {
  handoff: ContentDirectionsHandoffV1;
  domain: string;
  channel?: string;
  fixturePath?: string;
};

export type ProduceContentFromHandoffResult =
  | {
      ok: true;
      atom: ContentAtom;
      brandCore: BrandCore;
      studioPackage: ReturnType<typeof youtubeShortToStudioPackage>;
      youtubeShortPackage: YouTubeShortPackage;
    }
  | {
      ok: false;
      error: string;
      status: number;
      errors?: string[];
      channel?: string;
    };

/**
 * Brain use case: Brand Core + selected handoff → Atom → enabled specialist package.
 */
export async function produceContentFromHandoff(
  input: ProduceContentFromHandoffInput
): Promise<ProduceContentFromHandoffResult> {
  const domain = input.domain.trim();
  const variation = input.handoff.variations.find(
    (v) => v.id === input.handoff.selectedVariationId
  );
  if (!variation) {
    return {
      ok: false,
      error: "selectedVariationId not in variations",
      status: 400,
    };
  }

  const channelRaw = (input.channel ?? "youtube_short").trim();
  const registryKey =
    CHANNEL_KEY_BY_SPECIALIST[channelRaw] ??
    CHANNEL_KEY_BY_SPECIALIST[channelRaw.replaceAll("_", "-")];

  if (!registryKey || channelRegistry[registryKey].status !== "enabled") {
    return {
      ok: false,
      error: "Adapter not connected yet",
      status: 422,
      channel: channelRaw,
    };
  }

  const loaded = await loadBrandContextForAtom({
    domain,
    fixturePath: input.fixturePath,
  });
  if (!loaded.ok) {
    return {
      ok: false,
      error: loaded.error,
      status: loaded.status,
    };
  }

  const brain = await runCoreContentBrain({
    context: loaded.context,
    preferLlm: PRODUCT_ATOM_PREFER_LLM,
    selected: {
      masterTopic: input.handoff.masterTopic,
      variation,
    },
  });

  if (!brain.ok) {
    return {
      ok: false,
      error: brain.errors.join("; "),
      status: 422,
      errors: brain.errors,
    };
  }

  const yt = generateYouTubeShortPackage({ atom: brain.atom });
  if (!yt.ok) {
    return {
      ok: false,
      error: yt.errors.join("; "),
      status: 422,
      errors: yt.errors,
    };
  }

  const studioPackage = youtubeShortToStudioPackage(brain.atom, yt.package);

  if (process.env.NODE_ENV !== "production") {
    try {
      await saveAtomRecord(brain.atom);
      await savePackageRecord({
        packageId: yt.package.package_id,
        channel: "youtube-short",
        package: yt.package,
      });
    } catch {
      // store best-effort in dev
    }
  }

  return {
    ok: true,
    atom: brain.atom,
    brandCore: brain.brandCore,
    studioPackage,
    youtubeShortPackage: yt.package,
  };
}

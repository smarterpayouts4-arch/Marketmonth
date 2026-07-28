import type { ContentBrainContext } from "@/brain/content/types";

import { classifyOfferNoun } from "./classify-offer";
import { pushUnique } from "./helpers";
import type { TopicSubject } from "./types";

export function extractPlatformCapabilities(
  context: ContentBrainContext
): TopicSubject[] {
  const out: TopicSubject[] = [];
  context.products.forEach((p, i) => {
    const s = classifyOfferNoun(p, `products[${i}]`, context);
    if (s.kind === "platform_capability") pushUnique(out, s);
  });
  context.services.forEach((svc, i) => {
    const s = classifyOfferNoun(svc, `services[${i}]`, context);
    if (s.kind === "platform_capability") pushUnique(out, s);
  });
  return out;
}

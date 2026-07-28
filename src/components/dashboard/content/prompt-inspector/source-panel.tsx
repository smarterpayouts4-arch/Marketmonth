import type { ContentDirectionsHandoffV1 } from "@/brain/content/types";

import { Field } from "./field";

export function SourcePanel({ handoff }: { handoff: ContentDirectionsHandoffV1 }) {
  const variation =
    handoff.variations.find((v) => v.id === handoff.selectedVariationId)
      ?.punchline ?? handoff.selectedVariationId;

  return (
    <dl className="space-y-2.5">
      <Field label="Master topic" value={handoff.masterTopic.punchline} />
      <Field label="Selected variation" value={variation} />
      <Field label="Marketing focus" value={handoff.marketingFocus} />
      <Field
        label="Evidence summary"
        value={
          handoff.extraContextSummary ||
          `Mode: ${handoff.mode}. Context ${handoff.contextVersion}.`
        }
      />
    </dl>
  );
}

import type { ContentChannel, ProductionPackage } from "../types";

import { Field } from "./field";

export function AdapterPanel({
  channel,
  pkg,
}: {
  channel: ContentChannel;
  pkg: ProductionPackage | null;
}) {
  if (channel !== "youtube_short") {
    return (
      <p className="text-xs text-text-secondary">
        Adapter not connected yet for {channel}.
      </p>
    );
  }
  if (!pkg) {
    return <p className="text-xs text-text-secondary">No package loaded.</p>;
  }
  return (
    <dl className="space-y-2.5">
      <Field label="Platform" value={channel} />
      <Field label="Format" value={pkg.format} />
      <Field label="Title" value={pkg.metadata.title ?? pkg.copy.headline} />
      <Field label="Spoken hook" value={pkg.copy.openingLine} />
      <Field label="Script" value={pkg.copy.body} />
      <Field label="Visual direction" value={pkg.visual.visualDirection} />
      <Field label="CTA" value={pkg.cta.label} />
      <Field label="Aspect ratio" value={pkg.visual.aspectRatio} />
      <Field
        label="Duration (s)"
        value={
          pkg.video?.durationSeconds != null
            ? String(pkg.video.durationSeconds)
            : "—"
        }
      />
    </dl>
  );
}

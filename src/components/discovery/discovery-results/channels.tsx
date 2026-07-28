import { DiscoveryReadMore } from "@/components/discovery/discovery-read-more";
import type { DiscoveryCardSummary } from "@/components/discovery/types";

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-xs leading-relaxed text-text-secondary sm:text-[13px]">
      <span className="font-medium text-foreground">{label}</span> {value}
    </p>
  );
}

function FullMetaRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm leading-relaxed text-text-secondary">
      <span className="font-medium text-foreground">{label}</span> {value}
    </p>
  );
}

function joinOr(items: string[], empty: string): string {
  return items.length ? items.join(" · ") : empty;
}

/** Distribution signals — Growth Direction only. Honest detection language. */
export function ChannelFooter({ summary }: { summary: DiscoveryCardSummary }) {
  const preview = (
    <div className="space-y-1">
      <MetaRow
        label="Detected website links:"
        value={joinOr(summary.activeChannels, "None detected on the website")}
      />
      <MetaRow
        label="Not detected on the website:"
        value={joinOr(
          [...summary.missedChannels, ...summary.missedArticlePlatforms],
          "None listed"
        )}
      />
      <MetaRow
        label="Suggested comparisons:"
        value={joinOr(summary.suggestedCompetitors, "To be refined")}
      />
      <p className="text-[11px] leading-relaxed text-text-muted">
        Presence has not been independently verified.
      </p>
    </div>
  );

  return (
    <div className="rounded-lg border border-border/80 bg-background/50 px-3 py-2.5">
      <p className="text-[11px] font-semibold tracking-[0.06em] text-text-muted uppercase">
        Distribution signals
      </p>
      <div className="mt-1.5">
        <DiscoveryReadMore
          title="Distribution signals"
          triggerLabel="View all"
          overflow={summary.overflow.meta}
          preview={preview}
          description="Link detection from the website only — not performance proof."
        >
          <div className="space-y-2">
            <FullMetaRow
              label="Detected website links:"
              value={joinOr(
                summary.full.activeChannels,
                "None detected on the website"
              )}
            />
            <FullMetaRow
              label="Not detected on the website:"
              value={joinOr(
                [
                  ...summary.full.missedChannels,
                  ...summary.full.missedArticlePlatforms,
                ],
                "None listed"
              )}
            />
            <FullMetaRow
              label="Suggested comparisons:"
              value={joinOr(
                summary.full.suggestedCompetitors,
                "To be refined"
              )}
            />
            <p className="text-xs text-text-muted">
              Presence has not been independently verified. Missing links do not
              prove the brand is absent from a channel.
            </p>
          </div>
        </DiscoveryReadMore>
      </div>
    </div>
  );
}

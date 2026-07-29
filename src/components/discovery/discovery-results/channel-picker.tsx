import type { DetectedChannel, PlatformAdaptation } from "@/lib/discovery/discovery-narrative.schema";
import { platformDisplayName } from "@/lib/discovery/platform-names";
import { cn } from "@/lib/utils";

const labelPlatform = platformDisplayName;

export function PlatformAdaptationsList({
  adaptations,
}: {
  adaptations: PlatformAdaptation[];
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold tracking-[0.06em] text-text-muted uppercase">
        Platform adaptations
      </p>
      <ul className="space-y-1.5">
        {adaptations.map((a) => (
          <li
            key={a.platform}
            className="rounded-xl border border-border/70 bg-background/60 px-3 py-2 text-xs leading-snug text-text-secondary"
          >
            <span className="font-semibold text-foreground">
              {labelPlatform(a.platform)}
            </span>
            <span className="ml-2 text-[10px] uppercase tracking-wide text-text-muted">
              {a.status === "link-detected" ? "link detected" : "link not detected"}
            </span>
            <span className="mt-0.5 block">{a.guidance}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChannelPicker({
  channels,
  selected,
  onToggle,
  disabled,
}: {
  channels: DetectedChannel[];
  selected: string[];
  onToggle: (platform: string) => void;
  disabled?: boolean;
}) {
  const options = channels.length
    ? channels
    : ([
        { platform: "facebook", status: "link-not-detected" },
        { platform: "linkedin", status: "link-not-detected" },
        { platform: "youtube", status: "link-not-detected" },
      ] as DetectedChannel[]);

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold tracking-[0.06em] text-text-muted uppercase">
        Choose channels
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((c) => {
          const on = selected.includes(c.platform);
          return (
            <button
              key={c.platform}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(c.platform)}
              aria-pressed={on}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                on
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-text-secondary hover:text-foreground"
              )}
            >
              {labelPlatform(c.platform)}
              <span className="ml-1 font-normal text-text-muted">
                {c.status === "link-detected" ? "· linked" : "· not detected"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

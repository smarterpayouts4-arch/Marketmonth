import { cn } from "@/lib/utils";

import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  TiktokIcon,
  YoutubeIcon,
} from "../social-icons";
import {
  CHANNEL_METADATA,
  FORMAT_METADATA,
  type ChannelExecution,
  type SocialChannel,
} from "./types";

const CHANNEL_ICONS: Record<SocialChannel, typeof FacebookIcon> = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  youtube: YoutubeIcon,
  tiktok: TiktokIcon,
  linkedin: LinkedinIcon,
};

/**
 * Restrained per-channel icon tint — background stays neutral so brand
 * colors accent rather than overwhelm the card.
 */
const CHANNEL_ICON_TINT: Record<SocialChannel, string> = {
  facebook: "text-[#3b6aa8]",
  instagram: "text-[#b8508a]",
  youtube: "text-[#c1443a]",
  tiktok: "text-foreground",
  linkedin: "text-[#3d6e93]",
};

type ExecutionBadgeProps = {
  execution: ChannelExecution;
  className?: string;
};

/** Always shows the platform AND its format together — e.g. "Facebook ·
 * Carousel" — never a bare platform name. This is what tells the user a
 * daily idea is being adapted per channel, not copy-pasted everywhere. */
export function ExecutionBadge({ execution, className }: ExecutionBadgeProps) {
  const Icon = CHANNEL_ICONS[execution.channel];
  const channelMeta = CHANNEL_METADATA[execution.channel];
  const formatLabel = FORMAT_METADATA[execution.format].label;

  return (
    <li
      className={cn(
        "flex items-center gap-1.5 rounded-lg border border-border bg-background px-1.5 py-1 text-xs text-text-secondary",
        className
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "size-3.5 shrink-0",
          CHANNEL_ICON_TINT[execution.channel]
        )}
      />
      <span className="font-medium text-foreground">{channelMeta.label}</span>
      <span aria-hidden className="text-text-muted">
        ·
      </span>
      <span>{formatLabel}</span>
    </li>
  );
}

type ExecutionListProps = {
  executions: ChannelExecution[];
  className?: string;
};

/** Renders exactly the executions passed in — never infers channels or
 * formats from the weekday. */
export function ExecutionList({ executions, className }: ExecutionListProps) {
  return (
    <ul className={cn("flex flex-col gap-1", className)}>
      {executions.map((execution) => (
        <ExecutionBadge
          key={`${execution.channel}-${execution.format}`}
          execution={execution}
        />
      ))}
    </ul>
  );
}

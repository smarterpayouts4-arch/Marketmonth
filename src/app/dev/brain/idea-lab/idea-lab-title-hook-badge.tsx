type IdeaLabTitleHookBadgeProps = {
  rank: number;
  titleItchType?: string;
  titleHookVersion?: string;
};

/** Presentational only — surfaces topic-title-hook provenance. */
export function IdeaLabTitleHookBadge({
  rank,
  titleItchType,
  titleHookVersion,
}: IdeaLabTitleHookBadgeProps) {
  if (!titleItchType) return null;
  return (
    <span
      className="text-[10px] text-text-muted"
      data-testid={`idea-lab-candidate-title-itch-${rank}`}
      title={titleHookVersion}
    >
      trigger:{titleItchType}
    </span>
  );
}

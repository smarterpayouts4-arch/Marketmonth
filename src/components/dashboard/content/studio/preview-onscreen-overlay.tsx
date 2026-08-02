"use client";

import { splitOnScreenTextBlocks } from "@/brain/content-studio";
import { cn } from "@/lib/utils";

/** Highlight product keyword(s) in olive — matches Short ad treatment. */
const ACCENT_WORD_RE = /(magnesium)/gi;

function TitleWithAccent({ title }: { title: string }) {
  const parts = title.split(ACCENT_WORD_RE);
  return (
    <p className="studio-preview-onscreen-overlay__title">
      {parts.map((part, index) =>
        /^magnesium$/i.test(part) ? (
          <span
            key={`accent-${index}`}
            className="studio-preview-onscreen-overlay__accent"
          >
            {part}
          </span>
        ) : (
          <span key={`plain-${index}`}>{part}</span>
        )
      )}
    </p>
  );
}

const DEFAULT_ROLE_BY_ORDER = [
  "hook",
  "context",
  "claim",
  "proof",
  "payoff",
] as const;

export function resolveSceneRoleBadge(
  order: number,
  explicit?: string | null
): string {
  const trimmed = explicit?.trim();
  if (trimmed) return trimmed.toLowerCase();
  return DEFAULT_ROLE_BY_ORDER[order] ?? `scene`;
}

/** Re-export shared parser so Studio tests keep a stable import surface. */
export { splitOnScreenTextBlocks };

export type SceneOnScreenOverlayProps = {
  onScreenText: string;
  /** 0-based scene order — drives “Scene N” badge when showBadges. */
  sceneOrder?: number;
  /** Optional role chip (hook / context / …). */
  roleBadge?: string | null;
  showBadges?: boolean;
  compact?: boolean;
};

export function SceneOnScreenOverlay({
  onScreenText,
  sceneOrder = 0,
  roleBadge,
  showBadges = false,
  compact,
}: SceneOnScreenOverlayProps) {
  const blocks = splitOnScreenTextBlocks(onScreenText);
  if (!blocks.title) return null;
  const role = resolveSceneRoleBadge(sceneOrder, roleBadge);

  return (
    <div
      className={cn(
        "studio-preview-onscreen-overlay",
        compact && "studio-preview-onscreen-overlay--compact"
      )}
      data-testid="studio-preview-onscreen-overlay"
      aria-hidden
    >
      <div className="studio-preview-onscreen-overlay__stack">
        {showBadges ? (
          <div
            className="studio-preview-onscreen-overlay__badges"
            data-testid="studio-preview-onscreen-badges"
          >
            <span className="studio-preview-onscreen-overlay__badge studio-preview-onscreen-overlay__badge--scene">
              Scene {sceneOrder + 1}
            </span>
            <span className="studio-preview-onscreen-overlay__badge studio-preview-onscreen-overlay__badge--role">
              {role}
            </span>
          </div>
        ) : null}
        <TitleWithAccent title={blocks.title} />
        {blocks.support ? (
          <p className="studio-preview-onscreen-overlay__support">
            {blocks.support}
          </p>
        ) : null}
      </div>
      {blocks.disclaimer ? (
        <p className="studio-preview-onscreen-overlay__disclaimer">
          {blocks.disclaimer}
        </p>
      ) : null}
    </div>
  );
}

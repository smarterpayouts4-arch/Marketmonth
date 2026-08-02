"use client";

import type { ReadinessStatus, SceneAssetReadiness } from "@/brain/content-studio";

export type ReadinessChecklistProps = {
  readiness: SceneAssetReadiness;
};

function readinessGlyph(status: ReadinessStatus): string {
  if (status === "ready") return "✓";
  if (status === "generating") return "⟳";
  if (status === "interrupted") return "⏸";
  if (status === "outdated") return "!";
  if (status === "failed") return "×";
  if (status === "not_applicable") return "–";
  return "○";
}

function readinessLabel(status: ReadinessStatus): string {
  if (status === "ready") return "Ready";
  if (status === "generating") return "Generating";
  if (status === "interrupted") return "Interrupted — Retry";
  if (status === "outdated") return "Outdated";
  if (status === "failed") return "Failed";
  if (status === "not_applicable") return "N/A";
  return "Missing";
}

export function ReadinessChecklist({ readiness }: ReadinessChecklistProps) {
  return (
    <ul
      className="studio-asset-panel__checklist"
      data-testid="studio-scene-readiness-checklist"
    >
      {(
        [
          ["Prompt saved", readiness.promptSaved],
          ["Still image current", readiness.still],
          ["Voice current", readiness.voice],
          ["Motion current", readiness.motion],
          ["Composed MP4 current", readiness.composed],
        ] as const
      ).map(([label, status]) => (
        <li key={label} data-status={status}>
          <span aria-hidden>{readinessGlyph(status)}</span> {label}
          <span className="text-text-muted"> · {readinessLabel(status)}</span>
        </li>
      ))}
      <li
        className={
          readiness.sceneReady
            ? "studio-asset-panel__checklist-ready"
            : undefined
        }
        data-testid="studio-scene-ready-flag"
      >
        Scene {readiness.sceneReady ? "ready for assembly" : "not ready"}
      </li>
    </ul>
  );
}

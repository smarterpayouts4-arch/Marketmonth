import type {
  FullGenerateProgress,
  FullGenerateStepId,
  FullGenerateStepStatus,
} from "../../../hooks/use-atom-content-studio/use-studio-edit-actions";

export function stepGlyph(status: FullGenerateStepStatus): string {
  if (status === "running") return "⟳";
  if (status === "done" || status === "reused") return "✓";
  if (status === "error") return "!";
  if (status === "skipped") return "–";
  return "○";
}

export function stepLabel(id: FullGenerateStepId, status: FullGenerateStepStatus): string {
  const base: Record<FullGenerateStepId, string> = {
    save: "Scene saved",
    image: "Image generated",
    voice: "Voice generated",
    veo: "Motion video",
    compose: "Final MP4",
  };
  if (status === "reused") {
    const reused: Record<FullGenerateStepId, string> = {
      save: "Scene saved",
      image: "Image reused",
      voice: "Voice reused",
      veo: "Motion video reused",
      compose: "Final MP4 reused",
    };
    return reused[id];
  }
  if (status === "running") {
    const running: Record<FullGenerateStepId, string> = {
      save: "Saving scene…",
      image: "Image generating",
      voice: "Voice generating",
      veo: "Motion video generating",
      compose: "Final MP4 composing",
    };
    return running[id];
  }
  return base[id];
}

export function FullGenerateStepper({
  progress,
  stepperIds,
}: {
  progress: FullGenerateProgress;
  stepperIds: FullGenerateStepId[];
}) {
  return (
    <ol
      className="studio-asset-panel__hint"
      data-testid="studio-full-generate-stepper"
      style={{ listStyle: "none", padding: 0, margin: "0.5rem 0 0" }}
    >
      {stepperIds.map((id) => {
        const status = progress.steps[id];
        if (status === "skipped" && id === "save") return null;
        if (status === "skipped" && id === "veo") return null;
        return (
          <li key={id} data-testid={`studio-full-generate-step-${id}`}>
            {stepGlyph(status)} {stepLabel(id, status)}
          </li>
        );
      })}
    </ol>
  );
}

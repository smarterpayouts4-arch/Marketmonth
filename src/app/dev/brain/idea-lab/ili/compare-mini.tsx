import type { IdeaLabRun } from "@/brain/evaluation/idea-lab.types";

export function CompareMini({ title, r }: { title: string; r: IdeaLabRun }) {
  return (
    <div className="rounded-lg border border-border p-2 space-y-1">
      <p className="font-medium">{title}</p>
      <p className="truncate">{r.generation.masterTopic || "—"}</p>
      <p>provider: {r.input.providerUsed}</p>
      <p>hist: {String(r.historyPersisted)}</p>
    </div>
  );
}

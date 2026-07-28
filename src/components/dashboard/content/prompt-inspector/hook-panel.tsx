import type { ContentAtom } from "../types";

import { Field } from "./field";

export function HookPanel({ atom }: { atom: ContentAtom | null }) {
  if (!atom) {
    return <p className="text-xs text-text-secondary">Hook not loaded.</p>;
  }
  const hook = atom.hook_strategy;
  return (
    <dl className="space-y-2.5">
      <Field label="Hook family" value={hook.family} />
      <Field label="Opening intent" value={hook.opening_intent} />
      <Field label="Planted question" value={hook.planted_question} />
      <Field label="Withheld" value={hook.withheld_information ?? "—"} />
      <Field label="Resolution" value={hook.resolution} />
      <Field label="Creative mode" value={atom.creative_mode} />
    </dl>
  );
}

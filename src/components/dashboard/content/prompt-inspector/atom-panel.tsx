import type { ContentAtom } from "../types";

import { Field } from "./field";

export function AtomPanel({ atom }: { atom: ContentAtom | null }) {
  if (!atom) {
    return <p className="text-xs text-text-secondary">Atom not loaded.</p>;
  }
  return (
    <dl className="space-y-2.5">
      <Field label="Status" value={atom.status} />
      <Field label="Audience state" value={atom.audience.state} />
      <Field label="Audience problem" value={atom.audience.problem} />
      <Field
        label="Desired belief shift"
        value={`${atom.desired_belief_shift.from} → ${atom.desired_belief_shift.to}`}
      />
      <Field label="Central claim" value={atom.central_claim.canonical_wording} />
      <Field
        label="Proof"
        value={atom.supporting_proof.map((p) => p.meaning).join("\n")}
      />
      <Field label="Promised payoff" value={atom.promised_payoff} />
      <Field label="Intended action" value={atom.intended_action} />
      <Field label="Visual concept" value={atom.visual_concept} />
    </dl>
  );
}

# Cursor adapter

Layers (honest reliability model):

| Layer | Path | Role |
|-------|------|------|
| Bridge rule | `agent-prompt-router.mdc` → `.cursor/rules/` | **Advisory** — `alwaysApply` MUST checklist |
| Bootstrap rule | `agent-bootstrap.mdc` → `.cursor/rules/` | **Advisory** — ≤15-line cold-start routing (no doctrine) |
| Hooks | `hooks/` + `hooks.json` → `.cursor/` | **Soft enforcement** — remind / soft-warn; fail-open |
| Skill | `skills/aps-router/` → `.cursor/skills/` | On-demand walkthrough |

Rules alone are **not** mathematically 100% obedient. Hooks raise odds; they still fail-open on parse errors and cannot force model cognition.

## Install

```bash
node agent-prompt-system/scripts/install.mjs
```

Copies:

- `.cursor/rules/agent-prompt-router.mdc`
- `.cursor/rules/agent-bootstrap.mdc`
- `.cursor/skills/aps-router/SKILL.md`
- `.cursor/hooks.json`
- `.cursor/hooks/**` (including `lib/substantial-prompt.mjs`)

with backup-on-change. Do not hand-edit installed copies — edit adapters, then re-install. `validate.mjs` fails if they drift.

**Validate proves packaging integrity only — not that agents complied.**

No `globs` alongside `alwaysApply` (avoids miscategorization bugs).

## Hooks (soft enforcement)

| File | Role |
|------|------|
| `aps-before-submit.mjs` | Substantial heuristic → session marker; `routed: false`; model-side reminder |
| `aps-pre-tool-use.mjs` | Track paths; re-remind if substantial && !routed; **never** sets `routed` from reminder alone |
| `aps-stop.mjs` | Evidence / Knowledge OS; notes when routing was never confirmed |
| `lib/substantial-prompt.mjs` | Shared heuristic + brief-shape helper |

Session marker `.cursor/hooks/.aps-session.json` is local-only (gitignored).

Optional ack (only mechanism that sets `routed: true`): `.cursor/hooks/.aps-routed-ack.json` with `{ "brief": "Selected workflows: …" }`.

Stop timeout is **360s** so Knowledge OS + quality scripts can finish.

### Substantial-prompt heuristic

Shared via `isSubstantialPrompt`: length > 40 and keyword match (see README Limitations + `tests/routing-fixtures.json` for false negatives). Avoid bare `write` / `create`.

## APS brief (user-visible contract)

On substantial turns, the bridge requires the **first user-visible paragraph** to include:

```text
Selected workflows: <id-1>, <id-2?>
```

That line is the APS brief — not a Cursor UI card, and not a hidden hook `agent_message` (hooks talk to the model).

## Personas

EXPERIMENTAL under `personas/` — not installed here.

## Kickoff if routing was skipped

```text
Use the Agent Prompt System to interpret this request, select the appropriate
workflow, create the task specification, and then proceed:
[MY REQUEST]
```

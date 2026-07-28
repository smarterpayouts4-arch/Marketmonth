# Agent Prompt System

Portable **Cursor task-routing** kit: classify conversational engineering requests → pick ≤3 workflows → load only needed `project-context` → write a task spec → verify with evidence labels.

> **Terminology:** **APS** = Agent Prompt System (Cursor agents). **API** = Next.js `/api/*` routes. **Product prompts** = runtime LLM strings in feature modules (e.g. `src/brain/**/prompt*.ts`). **Project Knowledge** = `project-knowledge/`. **Project Context** = APS pointer stubs. There is **no** `src/lib/prompts/PROMPTS.md` in this host.

## Overview

### What it is

A structured, reusable **context-engineering system** you can copy into another repository, install with a thin Cursor bridge, and adapt via `project-context/` without carrying product-specific assumptions in the portable core.

### What problem it solves

Large repos cause agents to overbuild, skip investigation, ignore integrity tools, or claim “done” without evidence. APS gives the right **workflow, context, scope, and verification** at the right time — not a longer universal prompt.

### Why not one giant prompt

- Always-loaded bibles waste context and still miss the right process  
- Product doctrine must stay in repo SoTs (`AGENTS.md`, boundary code, chat policy)  
- Workflows are **composable** and load selectively (≤3)  

### How pieces work together

| Piece | Role |
|-------|------|
| Cursor bridge | Thin `alwaysApply` rule: when to consult APS (**advisory**) |
| Project hooks | `.cursor/hooks*` + `.cursor/hooks.json` — remind / soft-warn (**soft enforcement**; installed by `install.mjs`) |
| Router skill | `.cursor/skills/aps-router` — on-demand preflight walkthrough |
| `core/` | Router, spec builder, context selection, verification, safety |
| `manifest.json` | Machine inventory of workflows + metadata |
| `workflows/` | Focused playbooks |
| `project-context/` | **This** repo’s pointers (regenerate elsewhere) |
| `scripts/` | install / validate / initialize (Node, no deps) |

**Honesty bound:** rules = guidance; hooks = mechanical reminders/soft-blocks; still **not** mathematically 100% model obedience. Target is routing + evidence labels on nearly all substantial turns.

See also `SYSTEM.md` and `adapters/cursor/README.md`.

## Quick start

### Using it inside this repository

```bash
node agent-prompt-system/scripts/install.mjs
node agent-prompt-system/scripts/validate.mjs
```

Then give a substantial request normally. The bridge should kick in. Optional kickoff if skipped:

```text
Use the Agent Prompt System to interpret this request, select the appropriate
workflow, create the task specification, and then proceed:
[MY REQUEST]
```

### Copying into another repository

1. Copy the entire `agent-prompt-system/` folder  
2. `node agent-prompt-system/scripts/install.mjs`  
3. `node agent-prompt-system/scripts/initialize-project-context.mjs`  
4. In Cursor, run workflow **onboard-new-project** and fill `project-context/`  
5. `node agent-prompt-system/scripts/validate.mjs`  
6. Grep `core/` + `workflows/` for previous product paths — must be clean  

### Manual install (no script)

Prefer `install.mjs`. It copies bridge rule, skill, `hooks.json`, and all `adapters/cursor/hooks/**` files.

**Do not hand-edit** installed `.cursor` APS copies. Edit adapters, then re-run `install.mjs`. `validate.mjs` fails if installed files drift from adapters (including hooks). **Validate proves packaging sync only — not agent compliance.**

## How Cursor uses it

### Generated Cursor artifacts

| Installed (generated) | Adapter SoT |
|-----------------------|-------------|
| `.cursor/rules/agent-prompt-router.mdc` | `adapters/cursor/agent-prompt-router.mdc` |
| `.cursor/skills/aps-router/SKILL.md` | `adapters/cursor/skills/aps-router/SKILL.md` |
| `.cursor/hooks.json` | `adapters/cursor/hooks.json` |
| `.cursor/hooks/**` | `adapters/cursor/hooks/**` |

Frontmatter on the bridge: `alwaysApply: true` — short instructions only; does not dump the library.

### Pointer rule

APS `project-context/` files are pointers, not doctrine. Resolve every pointer and read the canonical `project-knowledge/` document before reasoning from it.

### When routing is triggered

Multi-file changes, new features, architecture, runtime bugs, data-flow / auth / SEO / schema / refactors / UI redesigns / performance / security / unclear requirements / investigations / planning / docs and knowledge work.

Hooks also use a keyword heuristic (`aps-before-submit.mjs`) so investigation/docs prompts remind the agent — still fail-open.

### Simple-request bypass

Explain one function, locate a file, typo / one-line fix, narrow factual Q&A → answer directly.

### APS brief (user-visible)

On **substantial** turns, the agent’s **first user-visible paragraph** should open with:

```text
Selected workflows: plan-feature, test-and-verify
```

Optional:

```text
Selected personas: leverage_planner (primary)
```

Then a short task-spec block (goal, in/out of scope, acceptance, verification). End the turn with evidence labels from `core/verification-contract.md`.

That `Selected workflows:` line **is** the APS brief. APS does **not** ship a separate chat card UI. Do not confuse this with the legacy Reference-folder “APS Intent Compiler / APS card” design (not installed).

### Workflow selection

1. Read `manifest.json`  
2. Review short descriptions  
3. Select smallest set (normally 1–3)  
4. Load only those workflows’ `required_context`  
5. State selected IDs in the APS brief (first user-visible paragraph)  

### Task specifications

Use `core/spec-builder.md` / `templates/task-spec-template.md`: goal, current/desired behavior, constraints, non-goals, assumptions, acceptance, verification.

### Verification attachment

Every substantial workflow defines verification **before** broad implementation. Completion uses labels from `core/verification-contract.md`: Verified / Partially verified / Not verified / Blocked / Assumed.

### Precedence

1. Explicit current user instruction  
2. Safety / security  
3. Repo protected-area + product-boundary rules  
4. Existing mandatory project rules (e.g. domain `.mdc` when globs match)  
5. Agent Prompt System routing  
6. Selected workflows  
7. Defaults  

Surface conflicts; do not silently override product doctrine.

## Folder reference

| Path | Contents |
|------|----------|
| `core/` | Portable behavior contracts |
| `workflows/<id>/WORKFLOW.md` | Composable playbooks + YAML frontmatter |
| `project-context/` | Pointers into `project-knowledge/` only (not doctrine) |
| `templates/` | Workflow / context / task-spec / verification templates |
| `adapters/cursor/` | Canonical Cursor bridge + adapter README |
| `scripts/` | `install.mjs`, `validate.mjs`, `initialize-project-context.mjs` |
| `examples/` | Routed conversational scenarios |
| `feedback/` | Generalized lessons (no secrets / no full prompt dumps) |
| `manifest.json` | Machine-readable inventory |
| `SYSTEM.md` | System contract |
| `CHANGELOG.md` | Version history |

## Adding a workflow

1. Copy `templates/workflow-template.md` → `workflows/<id>/WORKFLOW.md`  
2. Fill YAML frontmatter (`id`, `version`, `title`, `description`, `categories`, `tags`, `risk_levels`, `use_when`, `do_not_use_when`, `compatible_with`, `required_context`)  
3. Write focused body sections (purpose, process, acceptance, verification, failure modes)  
4. Register the workflow in `manifest.json` (paths relative to `agent-prompt-system/`)  
5. Run `node agent-prompt-system/scripts/validate.mjs`  
6. Note the addition in `CHANGELOG.md`  

## Updating project context

**Belongs here:** concise, evidence-based pointers — architecture, commands, protected areas, risks, definition of done.

**Stays outside:** full product bibles, product runtime prompts, secrets, customer data, entire audit dumps.

When doctrine or scripts change, update `project-context/` only. Keep `core/` and `workflows/` generic.

## Portability

| Copy freely | Regenerate / replace |
|-------------|----------------------|
| `core/`, `workflows/`, `templates/`, `adapters/`, `scripts/`, `examples/`, `feedback/` scaffolds | `project-context/` |

**Outside the folder (generated):** `.cursor/rules/agent-prompt-router.mdc` — created by install; not the canonical SoT (template is).

## Safety and privacy

Do **not** log into `feedback/`:

- Secrets, credentials, API keys  
- Customer / personal data  
- Proprietary production dumps  
- Full raw user prompts that contain sensitive material  

Record only generalized lessons (“workflow too broad”, “missing COMMANDS entry”).

## Maintenance

- **Versioning:** bump `manifest.json` `systemVersion` and `CHANGELOG.md` for material changes  
- **Workflow review:** skim `feedback/` periodically; promote, split, or deprecate  
- **Deprecation:** mark in CHANGELOG; remove from manifest when unused  
- **Conflict resolution:** product/protected rules win; surface conflicts  
- **Manifest sync:** always run `validate.mjs` after workflow/manifest edits  
- **After pull:** re-run `install.mjs` if the adapter template changed (idempotent; backs up prior bridge on content change)

## Troubleshooting

| Symptom | Action |
|---------|--------|
| Cursor does not consult the library | Re-run install; confirm bridge `alwaysApply`; use explicit kickoff |
| Wrong workflow selected | Note in `feedback/workflow-improvements.md`; tighten `use_when` / tags |
| Existing rules conflict | Precedence wins; say so in the reply |
| Project context stale | Refresh pointers; optionally `initialize-project-context.mjs` then onboard |
| Validation fails | Fix missing paths, duplicate IDs, bad compatible_with, README sections |
| Folder copied to another repo | install → initialize → onboard → validate; do not keep old product-context blindly |

## Uninstalling

1. Delete `.cursor/rules/agent-prompt-router.mdc`  
2. Optionally delete `*.bak-*` bridge backups  
3. Leave other `.cursor/rules/*` untouched  
4. Optionally remove the `agent-prompt-system/` folder  

## Limitations (v1)

- Cursor still decides whether to obey the bridge (rules are advisory)  
- Hooks improve reliability but fail-open on errors and cannot guarantee cognition  
- `agent_message` from hooks is **model-side** — not a user-visible APS dashboard; the user-facing contract is the first-paragraph `Selected workflows:` brief  
- Substantial heuristic has false negatives (see `tests/routing-fixtures.json`); fixtures document them  
- Session `routed: true` requires `.cursor/hooks/.aps-routed-ack.json` with a valid brief shape — a reminder alone never marks routing complete  
- Thinking personas are **EXPERIMENTAL** (not installed; no registry shipped)  
- project-context drifts unless refreshed  
- Init scaffolds; human review required for new repos  
- No embeddings, APS MCP server, product UI, or automatic prompt logging  

## Related

- Investigation: `docs/audits/agent-prompt-system-investigation.md`  
- Portable idea brief: `innovatives/agent-prompt-system.md`  

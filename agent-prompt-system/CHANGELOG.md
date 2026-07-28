# Changelog

## 1.0.5 — 2026-07-27

- **Routing-state honesty:** preToolUse reminder no longer sets `routed: true`; optional `.aps-routed-ack.json` with valid brief shape is the only ack path
- **Install + validate hooks:** `install.mjs` / `validate.mjs` manage `hooks.json` + `hooks/**`; example matches SoT (stop timeout 360)
- Shared `lib/substantial-prompt.mjs`; expanded `tests/routing-fixtures.json` + behavioral checks in `routing-smoke.mjs`
- Docs: terminology (APS/API/product prompts/Project Knowledge/Context); remove stale `src/lib/prompts/PROMPTS.md`; SYSTEM principle 5 → truth in `project-knowledge/`
- Personas lifecycle marked **EXPERIMENTAL** (no registry shipped)
- Validate exit text clarifies packaging ≠ agent compliance
- User-visible contract documented as first-paragraph brief (not hidden `agent_message`)

## 1.0.4 — 2026-07-27

- Define user-visible **APS brief** = first-paragraph `Selected workflows: …` (+ task spec + evidence labels); not a chat card / Intent Compiler
- Widen `aps-before-submit` substantial heuristic for investigate/plan/docs/knowledge/markdown/diagnose/research
- Bridge + aps-router skill require APS brief in the first user-visible paragraph on substantial turns
- Adapter README documents heuristic keywords and that hooks are synced separately from `install.mjs`

## 1.0.3 — 2026-07-26

- Workflow Router persona in `core/request-router.md` (thin cues in Cursor bridge + aps-router skill)
- Host CURRENT_STATE Integration Lead persona remains in `project-knowledge/CURRENT_STATE.md` (not portable APS core)

## 1.0.2 — 2026-07-24

- Pointer rule: APS `project-context/` are pointers, not doctrine (skill, bridge, context-selection)
- `install.mjs` generates both `.mdc` bridge and `aps-router` skill; `validate.mjs` fails on drift
- New workflow `use-agent-toolchain` (narrowest authoritative source)
- Feedback log seeded with Observed/Impact/Preventive/Promotion format
- Routing smoke fixtures + `scripts/routing-smoke.mjs`

## 1.0.1 — 2026-07-20

- Stronger Cursor bridge MUST checklist (still advisory)
- Project hooks + aps-router skill; adapter docs for enforcement vs advice
- README honesty bound; AGENTS substantial-task checklist (host)

## 1.0.0 — 2026-07-20

- Initial Agent Prompt System library
- 12 workflows + manifest schema v1
- Cursor bridge adapter + install/validate/initialize scripts
- Host project-context populated as pointer summaries (separate from portable core)
- README expanded to full operator playbook (overview → uninstall)
- validate.mjs checks compatible_with IDs, README sections, absolute host-path leaks

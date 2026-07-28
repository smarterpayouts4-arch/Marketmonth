# APS v1 hardening audit — 2026-07-27

**Verdict: sound with confirmed gaps** (architectural correction not required)

## Classification

| Field | Value |
|-------|--------|
| Intent | Audit + strengthen APS packaging, routing-state honesty, fixtures, docs, persona lifecycle |
| Scope | `agent-prompt-system/**`, `.cursor` APS installs, related docs/README; **not** product runtime |
| Risk | Medium (hooks/install affect all Cursor agent turns) |
| Evidence | INSPECTED sources; EXECUTED install/validate/routing-smoke + deliberate drift |
| Dependencies | Cursor project hooks enabled; Node for scripts |
| Blast radius | Builder process only — no Next.js / Brain / Idea Lab runtime |

## Current-state architecture

```text
Cursor Agent chat
  → bridge rule (.cursor/rules) + skill + hooks
  → project-context pointers → project-knowledge/
  → edits code/docs
  → stop: evidence + optional Knowledge OS

npm run dev
  → knowledge:sync + next dev
  → product APIs / Brain / Discovery
  → no APS execution
```

## Audit answers

| # | Question | Answer | Label |
|---|----------|--------|-------|
| 1 | APS across entire repo? | Yes for Cursor engineering on any area; soft/advisory | INSPECTED |
| 2 | Hooks drift without validate? | **Fixed** — hooks + hooks.json in install/validate | EXECUTED |
| 3 | routed without brief? | **Fixed** — reminder ≠ routed; ack file required | EXECUTED |
| 4 | Routing visible to user? | Visible contract = first-paragraph brief; hook `agent_message` is model-side | INSPECTED |
| 5 | Short eng bypass? | Yes — documented FN fixtures | EXECUTED |
| 6 | Docs agree on truth location? | **Fixed** — SYSTEM/README → `project-knowledge/` | INSPECTED |
| 7 | Missing/stale refs? | **Fixed** PROMPTS.md; personas registry marked absent | INSPECTED |
| 8 | Personas? | **EXPERIMENTAL** — not operational | INSPECTED |
| 9 | Runtime import APS? | No (only SEO exclude path strings) | INSPECTED |
| 10 | Validate vs compliance? | Validate prints packaging-only disclaimer | EXECUTED |

## Confirmed defects addressed

1. `routed: true` after soft warn → removed  
2. Hooks outside install/validate → included  
3. Stale `src/lib/prompts/PROMPTS.md` claims → removed  
4. SYSTEM principle 5 wrong SoT → corrected  
5. Personas appeared operational → EXPERIMENTAL  
6. Root README pointed product authority at APS stub → `project-knowledge/PRODUCT.md`

## File-by-file change plan (shipped)

| Area | Action |
|------|--------|
| `adapters/cursor/hooks/lib/substantial-prompt.mjs` | Added shared heuristic + brief helper |
| `aps-before-submit` / `aps-pre-tool-use` / `aps-stop` | Routing-state honesty + stop notes |
| `adapters/cursor/hooks.json` (+ example) | SoT; stop timeout 360 |
| `scripts/install.mjs` / `validate.mjs` | Install + drift-check hooks |
| `tests/routing-fixtures.json` + `routing-smoke.mjs` | Corpus + behavioral checks |
| `SYSTEM.md` / `README.md` / adapter docs / skill / bridge | Terminology + boundaries |
| `personas/*` | EXPERIMENTAL lifecycle |
| `docs/audits/aps-v1-hardening-2026-07-27.md` | This report |
| Root `README.md` | Product authority pointer |

## Validation results

- `node agent-prompt-system/scripts/install.mjs` — OK  
- `node agent-prompt-system/scripts/validate.mjs` — PASS (packaging)  
- `node agent-prompt-system/scripts/routing-smoke.mjs` — PASS (18 fixtures + session tests)  
- Deliberate drift on installed hook → validate FAIL; re-install → PASS — EXECUTED  

## Boundary verification

- `predev` = `knowledge:sync` only — no APS — INSPECTED  
- No `src/` imports of APS modules — INSPECTED  
- Product prompts remain under Brain/Discovery — INSPECTED  
- Topic-strategy / Idea Lab runtime **not** modified — INSPECTED  

## Remaining risks / limitations

- Bridge remains advisory; model can omit the visible brief  
- Substantial heuristic false negatives remain (by design + fixtures)  
- Optional `.aps-routed-ack.json` is rarely used unless agents/humans write it  
- Workflow IDs in fixtures are checklist metadata, not live agent assertions  
- Personas still incomplete (activation requires human approval)

## Explicit verdict

**sound with confirmed gaps** — correct Cursor-wide process architecture; soft enforcement honesty bound remains.

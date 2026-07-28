---
name: aps-router
description: >-
  USE WHEN starting a substantial coding task in this repo — run Agent Prompt
  System preflight: classify request, select ≤3 workflows from
  agent-prompt-system/manifest.json, resolve project-context pointers into
  canonical project-knowledge/, emit task spec with acceptance and verification
  before large edits.
---

# APS Router Skill

**Persona cue:** Act as the Elite AI Workflow Router — classify and route before large edits. Full persona + SOP: `agent-prompt-system/core/request-router.md`.

## Pointer rule (mandatory)

APS `project-context/` files are pointers, not doctrine. Resolve every pointer and read the canonical `project-knowledge/` document before reasoning from it.

Never reason from stub prose alone. Prefer `mm_read_project_doc` for allowlisted ids when Discovery MCP is available.

## When to use

Substantial work: multi-file changes, features, bugs, SEO, refactors, security, performance, unclear requirements, toolchain/tool-selection questions.

## Steps

1. Read `agent-prompt-system/core/request-router.md` and `agent-prompt-system/manifest.json`.
2. Pick the smallest workflow set (**1–3**). Prefer compatible pairs (e.g. `debug-runtime-problem` + `test-and-verify`). When tool choice matters, include `use-agent-toolchain`.
3. **APS brief (first user-visible paragraph):** `Selected workflows: <ids>`. Do not bury or skip this on substantial turns.
4. For each selected workflow’s `required_context` under `agent-prompt-system/project-context/`: open the stub only to resolve its pointer, then **must** read the linked canonical file under `project-knowledge/` (or call `mm_read_project_doc`).
5. Write a short task spec using `agent-prompt-system/templates/task-spec-template.md` (or `core/spec-builder.md` fields).
6. Proceed with investigation/implementation inside scope.
7. Finish with evidence labels: Verified / Partially verified / Not verified / Blocked / Assumed.

## Bypass

Typos, locate-a-file, explain-one-function, one-line fixes — skip full routing.

## Precedence

User instructions and product/safety rules beat APS workflows. Surface conflicts.

## Not product chat policy

APS is Cursor-only. Do not merge with MarketMonth **product prompts** (runtime LLM strings under feature modules such as `src/brain/**/prompt*.ts` and Discovery `build-strategy/prompts.ts`). There is no `src/lib/prompts/PROMPTS.md` in this host.

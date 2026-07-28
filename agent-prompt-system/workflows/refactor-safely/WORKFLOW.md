---
id: refactor-safely
version: 1.0.0
title: Refactor Safely
description: Restructure code with behavior parity and protected-area awareness.
categories:
  - refactor
tags:
  - parity
  - structure
risk_levels:
  - medium
  - high
use_when:
  - Structure cleanup without intentional behavior change
  - Extract modules / reduce duplication
do_not_use_when:
  - User wants a visible product behavior change
  - No parity plan is possible
compatible_with:
  - test-and-verify
  - investigate-codebase
required_context:
  - PROJECT.md
  - ARCHITECTURE.md
  - PROTECTED-AREAS.md
  - COMMANDS.md
---

# Refactor Safely

## Purpose

Restructure code with behavior parity and protected-area awareness.

## When to use

- Structure cleanup without intentional behavior change
- Extract modules / reduce duplication

## When not to use

- User wants a visible product behavior change
- No parity plan is possible

## Required inputs

- User goal in plain language
- Any constraints (files, deadlines, “do not touch X”)
- Links to failing URLs, screenshots, or logs when relevant
- Project-context files listed in frontmatter `required_context`

## Investigation process

1. Read `core/request-router.md` selection rationale; confirm this workflow still fits.
2. Load only required project-context files (+ optional extras with a one-line reason).
3. Locate owners / SoTs; prefer existing docs and integrity tooling listed in `COMMANDS.md` / `PROJECT.md` over inventing parallel checklists.
4. Note competing copies or protected areas before editing.
5. Write or refresh a task specification (`core/spec-builder.md`) before large edits.

## Decision points

- Bypass vs full routing still appropriate?
- Need a second compatible workflow (≤3 total)?
- Investigation-only vs implement now?
- Which verification commands from `COMMANDS.md` apply?

## Implementation boundaries

- Stay inside the task-spec `in_scope` list.
- Prefer surgical diffs; do not “while we’re here” rewrite neighbors.
- Do not duplicate product doctrine into new docs — link SoTs.
- Do not log secrets into `feedback/`.
- If repo integrity/SEO tooling is listed in project-context, use it for evidence rather than guessing.

## Acceptance criteria

- Goal from the user is met within stated constraints
- Protected areas respected
- Verification plan executed or explicitly labeled Not verified / Blocked / Assumed
- No unrelated file churn

## Verification requirements

Follow `core/verification-contract.md`. Match evidence to the change type (tests, runtime repro, rendered metadata, Lighthouse, etc.). Prefer commands from `COMMANDS.md`.

## Failure modes

- Wrong workflow selected → stop, re-route, note in `feedback/workflow-improvements.md` (generalized)
- Stale project-context → refresh pointers; do not invent product truth
- Conflict with product/safety rules → surface conflict; do not silently override

## Completion format

1. Selected workflow IDs
2. Short task-spec summary (goal, scope, acceptance, verification)
3. What changed (paths)
4. Evidence with labels: **Verified** / **Partially verified** / **Not verified** / **Blocked** / **Assumed**
5. Residual risks / follow-ups

## Examples

See `examples/` for conversational routing samples that typically select this or a compatible set.

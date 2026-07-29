---
title: Idea Lab
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-28
related_paths:
  - src/app/dev/brain/idea-lab/**
  - project-knowledge/IDEA_LAB_TOPIC_STRATEGY.md
  - project-knowledge/IDEA_LAB_DIRECTION_HARDENING.md
  - data/companies/zynava.com/approved.csv
related_features:
  - idea-lab
  - content-brain
  - discovery-csv-quality
---

# FEATURE: Idea Lab

## Purpose

Dev / Marketing Topic surface for generating and selecting editorial directions from approved Brand Core / Zynava fixture data. Topic strategy and direction hardening live in dedicated doctrine docs — this brief is the feature ownership door.

## Ownership

| Layer | Path |
|-------|------|
| Topic strategy doctrine | `project-knowledge/IDEA_LAB_TOPIC_STRATEGY.md` |
| Direction hardening | `project-knowledge/IDEA_LAB_DIRECTION_HARDENING.md` |
| Dev UI | `src/app/dev/brain/idea-lab/` |
| Approved CSV cache | `data/companies/zynava.com/approved.csv` (via publish gate) |

## Boundaries

- Runtime history under `data/runtime/` is not doctrine — do not index as SoT.
- Idea Lab Flow reference binaries under `Flow Refernce/` are non-runtime and cursorignored.
- Do not treat fixture theater as production Brand Core for all tenants.

## Status

See [`CURRENT_STATE.md`](../CURRENT_STATE.md) → Content Brain / Brand·Strategy·Content (Partial).

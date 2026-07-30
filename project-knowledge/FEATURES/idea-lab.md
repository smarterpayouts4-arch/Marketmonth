---
title: Idea Lab
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-29
related_paths:
  - src/app/dev/brain/idea-lab/**
  - project-knowledge/IDEA_LAB_TOPIC_STRATEGY.md
  - project-knowledge/IDEA_LAB_DIRECTION_HARDENING.md
  - project-knowledge/DECISIONS/0005-content-atom-v2.md
  - data/companies/zynava.com/approved.csv
related_features:
  - idea-lab
  - content-brain
  - discovery-csv-quality
---

# FEATURE: Idea Lab

## Purpose

Dev / Marketing Topic surface for generating and selecting editorial directions from approved Brand Core / Zynava fixture data, then building/approving a Content Atom (select→atom). Topic strategy and direction hardening live in dedicated doctrine docs — this brief is the feature ownership door.

## Ownership

| Layer | Path |
|-------|------|
| Topic strategy doctrine | `project-knowledge/IDEA_LAB_TOPIC_STRATEGY.md` |
| Direction hardening | `project-knowledge/IDEA_LAB_DIRECTION_HARDENING.md` |
| Atom ADR | `project-knowledge/DECISIONS/0005-content-atom-v2.md` |
| Dev UI | `src/app/dev/brain/idea-lab/` (incl. Craft tab `ili/craft-tab.tsx`) |
| Approved CSV cache | `data/companies/zynava.com/approved.csv` (via publish gate) |

## Live (sandbox)

- Four **TopicCategoryId** chips; LLM topic candidates + deterministic fallback
- **LLM-as-judge always-on** (advisory; never blocks)
- **No human evaluation checklist** (drawer + `idea-quality.schema` removed)
- Select → Content Atom via product APIs; Craft used card + Craft tab
- Approve with `limitationsAcknowledgement` → **Create YouTube Content** → `/content?atomId=`
- Isolated Lab topic history CSV (never mutates product history)

## Boundaries

- Runtime history under `data/runtime/` is not doctrine — do not index as SoT.
- Idea Lab Flow reference binaries under `Flow Refernce/` are non-runtime and cursorignored.
- Do not treat fixture theater as production Brand Core for all tenants.
- Product Marketing Topic does **not** call the Lab LLM candidate path (two-generator policy).

## Status

See [`CURRENT_STATE.md`](../CURRENT_STATE.md) → Content Brain / Idea Lab (Partial overall; select→atom Lab path **Live**).

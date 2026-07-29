---
title: Content Brain
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-28
related_paths:
  - src/brain/content/**
  - src/brain/atom/**
  - src/brain/strategy-lock/**
  - src/brain/channels/**
  - src/app/api/brain/**
  - project-knowledge/CONTENT_BRAIN.md
related_features:
  - content-brain
  - idea-lab
---

# FEATURE: Content Brain

## Purpose

Canonical Content Brain pipeline: Brand Core → editorial directions → Content Atom → channel production (YouTube Short first). Doctrine SoT is [`CONTENT_BRAIN.md`](../CONTENT_BRAIN.md) — this brief is the ownership/nav door for agents.

## Ownership

| Layer | Path |
|-------|------|
| Doctrine | `project-knowledge/CONTENT_BRAIN.md` |
| Directions / MT | `src/brain/content/` |
| Atom + production | `src/brain/atom/`, `src/brain/strategy-lock/`, `src/brain/channels/` |
| API | `src/app/api/brain/` |
| Studio UI | `src/components/dashboard/content/` + `/content` |

## Boundaries

- Do not invent Gate 2 as Live — see CURRENT_STATE / CONTENT_BRAIN Gate status.
- Studio must stay honest (no fake generation).
- Discovery UI must not import Content Brain engine paths.

## Status

See [`CURRENT_STATE.md`](../CURRENT_STATE.md) → Content Brain (Partial).

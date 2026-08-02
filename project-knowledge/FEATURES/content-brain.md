---
title: Content Brain
status: active
authority: supporting
owner: engineering
last_verified: 2026-08-02
related_paths:
  - src/brain/content/**
  - src/brain/atom/**
  - src/brain/atom/craft-polish/**
  - src/brain/craft/**
  - src/brain/content-studio/**
  - src/brain/strategy-lock/**
  - src/brain/channels/**
  - src/brain/use-cases/produce-content-bundle.ts
  - src/brain/use-cases/review-content-atom.ts
  - src/app/api/brain/**
  - src/components/dashboard/content/**
  - project-knowledge/CONTENT_BRAIN.md
  - project-knowledge/DECISIONS/0005-content-atom-v2.md
related_features:
  - content-brain
  - idea-lab
---

# FEATURE: Content Brain

## Purpose

Canonical Content Brain pipeline: Brand Core → editorial directions → Content Atom v2 → approve/lock → channel / Studio production (YouTube Short + Video formats). Doctrine SoT is [`CONTENT_BRAIN.md`](../CONTENT_BRAIN.md) — this brief is the ownership/nav door for agents.

## Ownership

| Layer | Path |
|-------|------|
| Doctrine | `project-knowledge/CONTENT_BRAIN.md` |
| ADR (atom) | `project-knowledge/DECISIONS/0005-content-atom-v2.md` |
| Directions / MT | `src/brain/content/` |
| Atom + validation | `src/brain/atom/`, `src/brain/strategy-lock/` |
| Craft DNA | `src/brain/craft/` (shared clauses); atom polish `src/brain/atom/craft-polish/` |
| Content Studio production | `src/brain/content-studio/` + `use-cases/produce-content-bundle.ts` |
| Channel specialists | `src/brain/channels/` (Short enabled; Long not_connected) |
| Review / production use cases | `review-content-atom.ts`, `produce-content-bundle.ts` |
| API | `src/app/api/brain/` (`content-atom`, `content-atom/review`, `content/production`, …) |
| Studio UI | `src/components/dashboard/content/` + `/content?atomId=` (bare `/content` = empty state) |

## Live (Phase 1)

- **Content Atom v2** (`schemaVersion: content-atom-v2`)
- **Select → atom** after human picks one direction
- **Constrained LLM primary** (`PRODUCT_ATOM_PREFER_LLM = true` in `provider-policy.ts`); deterministic honest thin fallback
- **Craft DNA polish** opt-in / fail-closed (`ATOM_CRAFT_POLISH_PROVIDER` or experiment arm B); shared clauses in `src/brain/craft/`
- **No human Idea Lab evaluation checklist**
- **LLM-as-judge always-on** for Idea Lab topic candidate runs (advisory)
- Approval/lock before channel specialists; production from locked `atomId`
- Product MT + Idea Lab: approve/lock → `/content?atomId=` (auth via atom owner `companyId`); no localStorage Studio handoff
- `ContentProductionBundle` via `produceContentBundle`: YouTube Short via `youtube-short-service` (9:16) + YouTube Video adapter (16:9); idempotent refresh
- Manual Short loop (dev): durable PATCH + regen stale cascades; process-local in-flight mutex (not multi-instance safe); scene readiness + provenance; `finalShort` sourceHash fingerprint; FFmpeg re-encode concat; media preflight (ffprobe JSON + decode + upload URL check); download = manual YouTube upload. Operator gate: `npx tsx scripts/operator-first-short-eval.ts`. Verified in automated development tests; live-provider and operator acceptance remain pending.
- Evidence admission + claim capabilities; limited approve needs limitations ack; revise vs redirect
- Atom build trace = refs/metadata only; inspector reports word count (not a validity gate)
- Gate: `npm run verify:select-to-atom` (P0–P2)

## Boundaries

- Do not invent Gate 2 as fully Live — multi-package review shells remain Partial (see CURRENT_STATE / CONTENT_BRAIN).
- Studio must stay honest (no fake generation). Entry is atomId-only.
- Do not confuse content-studio **Video** format with `channelRegistry.youtubeLong` (`not_connected`).
- Content Studio is the **transitional** multi-format orchestrator (ADR 0006); Studio UI must not import channels/render/use-cases/bundle-store.
- Short duration: import `duration-policy.ts` only (default 60s / max 180s).
- Discovery UI must not import Content Brain engine paths.

## Status

See [`CURRENT_STATE.md`](../CURRENT_STATE.md) → Content Brain (Partial overall; Atom v2 / select→atom **Live**).

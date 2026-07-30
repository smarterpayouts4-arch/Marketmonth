---
title: ADR 0006 — Content Studio / channel ownership and Short draft contract
status: accepted
authority: supporting
owner: engineering
last_verified: 2026-07-30
related_paths:
  - src/brain/content-studio/
  - src/brain/channels/
  - src/brain/channels/youtube-short/duration-policy.ts
  - src/brain/channels/youtube-short/youtube-short-draft.ts
  - src/brain/use-cases/produce-content-bundle.ts
  - src/components/dashboard/content/
  - src/brain/render/
---

# ADR 0006 — Content Studio / channel ownership and Short draft contract

## Context

Phase 0 architecture audit found dual registries, dual Short schemas, Live Studio Video ≠ `youtubeLong`, session-only prompt edits, and an unused render layer. Product approved decisions D1–D8 (with D1 modified) before any deletion or large move.

## Decision

### Dependency direction (canonical)

```text
React UI (presentation + ephemeral UI state)
  → thin API route (auth, rate limit, tenant)
    → use case / multi-format orchestrator (Content Studio transitional)
      → channel / format specialist
        → renderer (shared worker; stub/dry-run until wired)
          → provider APIs
```

- UI must not import `@/brain/channels`, `@/brain/render`, `@/brain/use-cases`, `bundle-store`, or content-studio adapters.
- Renderer must not import channels or UI.
- Atom lock (`approvalStatus === locked`) remains the Gate for production; package statuses stay package-scoped (Gate 2 Partial).

### Dual registries (intentional)

| Registry | Path | Role |
|----------|------|------|
| `channelRegistry` | `src/brain/channels/channel-registry.ts` | Specialist **enablement** (`enabled` \| `not_connected`) |
| `PLATFORM_REGISTRY` | `src/brain/content-studio/platform-registry.ts` | Studio **format tabs** (Short + Video Live; other platforms `coming_soon`) |

Studio tabs read **platform-registry only**. Studio Video ≠ `channelRegistry.youtubeLong` (still `not_connected`).

### Content Studio transitional role

`src/brain/content-studio/` remains the **transitional multi-format orchestrator**: format registry, Studio DTOs, adapters, and JSON bundle persistence via `produceContentBundle`. It is not deleted in Phase 1. Short domain rules migrate toward `channels/youtube-short/` over later phases; Video stays in the Video format adapter until an enabled `youtube-long` specialist + ADR flip.

### D1 — Duration policy

Canonical constants live only in `src/brain/channels/youtube-short/duration-policy.ts`:

- **Default:** 60 seconds (MarketMonth initial product default, not a platform maximum claim)
- **Max:** 180 seconds (product policy ceiling; schemas/validators share this constant)

No duplicated 60/90 literals in Short channel or Studio Short schemas.

### D2 — Video ownership

Near-term: `youtube-video-adapter` + format registry. Target: `youtube-long` specialist after `enabled` + ADR (mirror Short). Never generate under `not_connected`.

### D3 — Layered Short schemas

Keep channel `YouTubeShortPackage` (generation SoT) and Studio `YouTubeShortFormatPackage` (UI/API projection) with a thin adapter. Do not collapse in Phase 1–2.

### D4 — Approval ownership

Atom lock gates production. Channel/format package status must not mutate atom `approvalStatus`.

### D5 — Persistence

`data/runtime/production-bundles/` via `bundle-store` = **dev / single-instance**. `json-store` is production-impossible. Neon (or equivalent) company-scoped store before multi-instance deploy. No second Short-only file store.

### D6 — Durable manual edits (Phase 2 Live)

Prompt/script edits persist by **PATCH** on `/api/brain/content/production` → `patchYouTubeShortDurableEdits` merging into the Short format package inside the existing `ContentProductionBundle` (`imagePrompt`, `voiceoverPrompt`, `script` + `durableEdits` + `generatedBaseline`).

**Merge policy on regenerate:** new generate refreshes `generatedBaseline`; prior `durableEdits` are re-applied onto effective fields. Reset clears `durableEdits` and restores `generatedBaseline`. sessionStorage is removed from the Save path.

### D7 — Renderer

`src/brain/render/` stays stub/dry-run. No Live provider work in Phase 1. Channel will build provider-neutral `ScenePlan` later; UI never calls render.

### D8 — Boundary tests

Architecture tests assert Content Studio UI ↛ channels / render / use-cases / bundle-store / adapters.

### Normalized draft (atom ∥ manual)

`YouTubeShortDraft` (`youtube-short-draft.ts`) is the convergence contract both atom-sourced and future manual-prompt paths must produce before render. Phase 1 defines the schema only; manual UI is not implemented.

## Consequences

- Phase 2 may introduce a Short channel service + edit PATCH without deleting content-studio.
- Phase 2.1: `youtube-short-adapter.ts` deleted — Short runtime is `youtube-short-service` only. Remaining content-studio pieces (bundle-store, Video adapter, schemas, platform-registry) stay until Video owner migration.

## Alternatives considered

- Collapse to UI → Short channel only (rejected: kills Live Video).
- Put Live Video under `not_connected` youtube-long (rejected: doctrine lie).
- New Neon table for Short edits only (rejected: duplicate store for v1).

# Content Brain (`src/brain/content`)

Brand-agnostic module that turns **one master topic** into **up to six concrete opportunity cards**, then lets the owner choose **exactly one** idea. That selected idea (plus the same Brand Core) becomes **one** Content Atom later — not six Atoms.

## Product model

```text
Company CSV → compileBrandCore() → shared Brand Core
  → master topic + up to six ideas (heading + idea_summary)
    → human selects ONE idea
      → Content Atom Builder (outside this folder)
```

| Concept | Role |
|---------|------|
| **Master topic** | Shared umbrella |
| **Idea heading** | `specificTopic` — concrete opportunity title |
| **Idea body** | `ideaSummary` — 180–600 chars, no filler |

## Ownership

| Layer | Owns | Must not |
|-------|------|----------|
| `src/brain/content` | Directions intelligence, schemas, normalize-topic | React, CSV history I/O, Atom/channel craft |
| `src/brain/use-cases/generate-content-directions.ts` | Load → compile → generate → history | HTTP / UI |
| API `POST /api/brain/content-directions` | Transport only | Load CSV, compile, write history |
| Dashboard `marketing-topic/` | Presentation + ephemeral session | Brain intelligence |

## Topic Generation History and Evaluation Repository

Documented name for `TopicGenerationRepository` (CSV adapter under `src/brain/store/`).

- Product history **and** longitudinal evaluation dataset
- Append-only generation runs; selection/status/evaluation/revision may update
- Never merges into Brand Core; never mutates company CSV
- Canonical identity: `generation_id` only

## Modes

- **automatic** / **manual** / **regenerate** / **evaluation**
- Product default provider: **deterministic-v1** (frozen templates; `prompt_version: none`).
- Opt-in experiment provider: **intelligent-v1** (`directionsProvider: "intelligent-v1"`). Manual mode first; automatic topic selection disabled until proven. Requires `OPENAI_API_KEY` (fails closed — no silent fallback).
- Selectable providers are only `deterministic-v1` | `intelligent-v1`. Invalid intelligent runs persist as `status: invalid` for experiment data.
- Local A/B: `npm run compare:directions-providers` (same manual topic + Brand Core).

## Handoff

`ContentDirectionsHandoffV1` keyed by `generationId` (full six + `selectedVariationId`).

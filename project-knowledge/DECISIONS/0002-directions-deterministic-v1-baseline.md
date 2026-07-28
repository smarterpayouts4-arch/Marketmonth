---
title: ADR 0002 — Directions deterministic-v1 baseline freeze
status: accepted
authority: supporting
owner: engineering
last_verified: 2026-07-26
related_paths:
  - src/brain/content/topic-generation-record.schema.ts
  - src/brain/content/providers/deterministic-provider.ts
  - src/brain/use-cases/generate-content-directions.ts
---

# ADR 0002 — Directions deterministic-v1 baseline freeze

## Context

Before introducing `intelligent-v1`, MarketMonth needs a reproducible product baseline for Directions generation. Experiments must compare against a known, frozen provider rather than a moving target.

This workspace has **no project-local git repository** at freeze time (no `.git` under MarketMonth). Baseline identity is therefore recorded by date, tool versions, suite results, and provider constants—not a commit hash. When a project git remote is initialized later, a follow-up note should attach the first commit that includes this ADR.

## Decision

1. **`deterministic-v1` is the official Directions baseline and product default.**
2. Product UI and the use case default remain on this provider until an explicit experiment chooses otherwise.
3. Baseline provenance constants (live code):
   - `DIRECTIONS_BRAIN_VERSION` = `"deterministic-v1"`
   - `DIRECTIONS_PROVIDER_ID` = `"deterministic-v1"`
   - `DIRECTIONS_PROMPT_VERSION` = `"none"` (no LLM prompt exists for this provider)
4. Future intelligent providers must use their own `brain_version` / `prompt_version` / `model` values and must not reuse these baseline constants.

## Freeze record

| Field | Value |
| ----- | ----- |
| Date (local) | 2026-07-26 |
| Git commit hash | **Unavailable** — no project-local git in MarketMonth |
| Node | v24.14.0 |
| npm | 11.9.0 |
| Product default provider | `deterministic-v1` |

### Command results

| Command | Exit | Notes |
| ------- | ---: | ----- |
| `npm run typecheck` | 0 | Pass |
| `npm test` | 0 | **109** tests pass, 0 fail, 0 skip, 0 todo (includes architecture-boundary) |
| `npm run lint` | 0 | 0 errors, 8 warnings (unused vars only) |
| `npm run build` | 0 | Next.js 16.2.11; knowledge:sync OK (hard=0 soft=0) |
| `npm run knowledge:check` | 0 | hard=0 soft=0 |

## Consequences

- A/B experiments (deterministic vs intelligent) can cite this freeze as the known baseline.
- Changing deterministic template output after this date requires a new baseline version id (e.g. `deterministic-v2`), not silent edits under `deterministic-v1`.
- Local-only work is fine; push/remote is out of scope for this freeze.

## Alternatives considered

- Freeze by provider name only without suite results — rejected (not reproducible).
- Wait for project git before freezing — rejected; local freeze with explicit “no commit” is better than delaying the lab.

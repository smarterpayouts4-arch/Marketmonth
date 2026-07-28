---
title: Content Brain Stabilization Baseline
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-28
---

# Content Brain Stabilization Baseline

Captured before contract/workflow changes. Audit artifact only — not brittle CI golden text.

## Environment

| Item | Value |
| ---- | ----- |
| Git commit | **Unavailable** — MarketMonth workspace has no local `.git` commits (`No commits yet` / no project-root git). Parent user-home git is not used as SoT. |
| Node | v24.14.0 |
| npm | 11.9.0 |
| Package | marketing-ai@0.1.0 |
| Date (UTC) | 2026-07-28T14:08:43.170Z |

## Env variable names (values redacted)

`AUTH_BYPASS`, `DEV_AUTH_BYPASS`, `AUTH_SECRET`, `AUTH_URL`, `OPENAI_API_KEY`, `OPENAI_DISCOVERY_MODEL`, `OPENAI_TOPIC_TITLE_POLISH_MODEL`, plus other local keys present in `.env.local` (not listed as product SoT).

## Commands executed

| Command | Result |
| ------- | ------ |
| `npm run typecheck` | PASS |
| `npm test` | PASS (219 tests) |
| `npx tsx scripts/capture-stabilization-baseline.ts` | PASS |

## Provider / model behavior (locked)

| Surface | Behavior |
| ------- | -------- |
| Product directions | `deterministic-v1` default (`PRODUCT_DEFAULT_DIRECTIONS_PROVIDER`) |
| Idea Lab directions | `deterministic-v1` only (`IDEA_LAB_DIRECTIONS_PROVIDER`) |
| Product atom | `PRODUCT_ATOM_PREFER_LLM = false` |
| openai-stub | Not a selectable provider |

## Runtime artifact locations

| Path | Role |
| ---- | ---- |
| `data/fixtures/zynava-discovery.csv` | Dev Brand Core ingest fixture |
| `data/fixtures/stabilization/*.json` | Stabilization scenario inputs |
| `data/fixtures/stabilization/baseline-outputs/` | Audit-only deterministic outputs |
| `data/runtime/` | Gitignored Idea Lab runs / history |
| Default topic history CSV | Via store factory (product) |
| Idea Lab history | `data/runtime/idea-lab-topic-history.csv` |

## Zynava deterministic baseline summary

| Scenario | Status | Variations | Notes |
| -------- | ------ | ---------- | ----- |
| normal-zynava-topic | ready | 6 | All required angles |
| broad-topic | ready | 6 | |
| narrow-product-topic | ready | 6 | |
| insufficient-evidence-topic | partially_ready | 6 | |
| duplicate-prone-topic | ready | 6 | |
| unsupported-claim-attempt | blocked | 0 | Safety blocked |

Full JSON under `data/fixtures/stabilization/baseline-outputs/`.

## Content Brain structure (relevant)

- `src/brain/core` — Brand Core
- `src/brain/content` — directions, handoff, safety
- `src/brain/atom` — Content Atom
- `src/brain/channels` — channel packages
- `src/brain/policy` — provider + model policy
- `src/brain/use-cases` — orchestration (product + `ild/`)
- `src/brain/evaluation` — Idea Lab + candidates
- `project-knowledge/CONTENT_BRAIN.md` — doctrine
- `reference-library/` — noncanonical research library (no imports)

## Known pre-existing gaps (not fixed in baseline)

- Ask route: no auth / rate limit
- Five named contracts not yet formalized
- Triple Brand Core compile on Idea Lab path
- No prompt metadata registry
- No product RunContext / draft-eval envelope
- No `validate:stabilization` script

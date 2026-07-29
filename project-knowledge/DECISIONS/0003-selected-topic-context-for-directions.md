---
title: ADR 0003 — SelectedTopicContext for Directions
status: accepted
authority: supporting
owner: engineering
last_verified: 2026-07-29
related_paths:
  - src/brain/content/direction-writing-context.ts
  - src/brain/content/topic-category.ts
  - src/brain/content/providers/deterministic-provider.ts
  - src/brain/use-cases/run-idea-lab-directions.ts
  - project-knowledge/IDEA_LAB_DIRECTION_HARDENING.md
  - project-knowledge/DECISIONS/0004-topic-category-model.md
---

# ADR 0003 — SelectedTopicContext for Directions

## Context

Idea Lab selects a ranked `TopicCandidate`, then asks `deterministic-v1` for six content directions. Passing only a free-text master title forced the generator to reverse-engineer subject, audience, and offer from a sentence. That produced awkward copy (`about How/Why/What`), weak objective differentiation, and risk of mutating `masterTitle` via trim/normalize at API boundaries.

ADR 0002 froze the **provider id** `deterministic-v1`. This ADR freezes the **structured handoff** into that provider and versions the copy-construction path separately.

## Decision

1. **Selected topic is structured data.** Callers that have a chosen candidate (or equivalent) MUST supply `SelectedTopicContext` with:
   - `topicId`
   - `masterTitle` (exact original string — never trim-assigned)
   - `objective` as canonical **`TopicCategoryId`** (four values per ADR 0004); legacy `MarketingFocus` values migrate via `parseTopicCategory`
   - optional audience / pain / strategic angle / relevance / evidence ids

> **Succession (ADR 0004):** This ADR’s directions handoff is unchanged. Topic **generation** upstream now uses four `TopicCategoryId` values instead of five `MarketingFocus` values. See [`0004-topic-category-model.md`](./0004-topic-category-model.md).

2. **Writing context is derived once.** `buildDirectionWritingContext` produces immutable `DirectionWritingContext` with `DerivedLabel` provenance and `framingStrategy` from `framingStrategyForObjective`. Priority: selected topic → brand context → title-parse fallback (fallback must not rewrite `masterTitle`).

3. **Version identities:**
   - `providerUsed` / provider id: `deterministic-v1` (unchanged)
   - `generatorVersion`: `deterministic-directions-v2`
   - `writingContextVersion`: `direction-writing-context-v1`

4. **Angles remain the existing `ContentAngle` enum** — six distinct values per run.

5. **Claims:** reframe only what appears in selected topic / brand context; do not invent capabilities or results.

6. **Fixtures** under `src/brain/content/__fixtures__/direction-writing/` are test- and documentation-only; production generation must not load them.

7. **Canonical reference:** [`IDEA_LAB_DIRECTION_HARDENING.md`](../IDEA_LAB_DIRECTION_HARDENING.md).

## Consequences

- Idea Lab lineage can prove objective framing structurally (`framingStrategy`) without scraping copy.
- Product Marketing Topic can adopt the same handoff without changing the provider baseline id.
- Future copy-path changes bump `deterministic-directions-vN` (and/or writing-context version); they do not silently rewrite ADR 0002’s provider freeze.

## Alternatives considered

- **Title-only handoff with smarter regex** — rejected; still reverse-engineering and brittle across categories.
- **Bump provider id to `deterministic-v2`** — rejected for this slice; provider baseline stays ADR 0002; generator implementation version is enough.
- **Load category fixtures in production** — rejected; fixtures are regression inputs only.

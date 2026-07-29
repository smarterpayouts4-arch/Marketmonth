---
title: Idea Lab — direction hardening (structured handoff)
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-29
related_paths:
  - src/brain/content/direction-writing-context.ts
  - src/brain/content/topic-category.ts
  - src/brain/content/providers/deterministic-provider.ts
  - src/brain/content/generate-content-directions.ts
  - src/brain/content/hook-enrichment/
  - src/brain/use-cases/run-idea-lab-directions.ts
  - src/brain/content/__fixtures__/direction-writing/
  - project-knowledge/DECISIONS/0003-selected-topic-context-for-directions.md
  - project-knowledge/DECISIONS/0004-topic-category-model.md
---

# Idea Lab — direction hardening (structured handoff)

## Purpose

Lock the six-direction path so a **selected topic is structured data**, not a sentence to reverse-engineer. Idea Lab (and any caller that supplies `SelectedTopicContext`) builds a `DirectionWritingContext`, then `deterministic-v1` writes six `ContentVariation`s with distinct `ContentAngle`s and an objective-driven `framingStrategy`.

This document is the human reference for runtime contracts, fixtures, tests, and the migration path into main Marketing Topic / Content Brain. ADR: [`DECISIONS/0003-selected-topic-context-for-directions.md`](./DECISIONS/0003-selected-topic-context-for-directions.md).

## Flow

```text
TopicCategoryId (four chips — ADR 0004)
  → TopicCandidate
  → SelectedTopicContext (objective = TopicCategoryId)
  → DirectionWritingContext (DerivedLabel + framingStrategy)
  → deterministic-v1 (generatorVersion deterministic-directions-v2)
  → six ContentVariations
  → hook-enrichment-v1 (optional OpenAI polish on creative fields only)
  → six final cards (deterministic fallback per card)
```

## Hook enrichment (`hook-enrichment-v1`)

Psychology / Marketing Hook polish runs **after** human topic selection and deterministic directions.

| May improve | Must not change |
|-------------|-----------------|
| opening hook, tension, curiosity gap, payoff, punchline | `masterTitle`, angle, subject, evidence, facts, objective |

- Default provider: deterministic passthrough.
- OpenAI only when `HOOK_ENRICHMENT_PROVIDER=openai` (model default **`gpt-5-nano`** via `OPENAI_HOOK_ENRICHMENT_MODEL`).
- Invalid AI output → keep that card’s deterministic fields. Never regenerate the whole direction set for a weak hook.
- Versioned separately from topic/direction generators.

## Version identities

| Identity | Value | Meaning |
| -------- | ----- | ------- |
| Provider id | `deterministic-v1` | Frozen provider baseline (ADR 0002) |
| Generator implementation | `deterministic-directions-v2` | Hardened copy-construction path |
| Writing context builder | `direction-writing-context-v1` | Structured handoff contract |
| Hook enrichment | `hook-enrichment-v1` | Creative-field polish only |

Lineage (Idea Lab) records all three plus `framingStrategy` and a snapshot of `DirectionWritingContext`.

## Canonical TopicCategoryId

Use only values from `src/brain/content/topic-category.ts` (ADR 0004):

`customer_questions` | `product_education` | `trust_proof` | `offers_conversion`

Retired `MarketingFocus` values in stored runs migrate via `parseTopicCategory`. **Awareness is out of scope** for topic generation — there is no `brand_awareness` chip and no `awareness_positioning` framing strategy.

## masterTitle byte-for-byte

`masterTitle` / `masterTopic` must survive **client → API → Zod → use case → provider** without trim-assign or rewrite.

- Validation may refine non-whitespace without mutating:

```ts
masterTitle: z.string().refine(
  (value) => value.trim().length > 0,
  "Master title is required"
);
```

- Provider returns `masterTopic.punchline === selectedTopicContext.masterTitle` when structured selection is present.
- Punctuation and casing tests use fixture `awkwardMasterTitle` values.

## Contracts (symbols)

| Symbol | File |
| ------ | ---- |
| `SelectedTopicContext` | `src/brain/content/direction-writing-context.ts` |
| `DirectionWritingContext` | same |
| `DerivedLabel` | same |
| `ObjectiveFramingStrategy` | same |
| `buildDirectionWritingContext` | same |
| `framingStrategyForObjective` | same |
| `IdeaLabDirectionLineage` | `src/brain/evaluation/idea-lab.types.ts` |
| `buildSixVariations` (internal) | `src/brain/content/providers/deterministic-provider.ts` |

### Derivation priority

For labels (`topicSubject`, audience, offer, pain, value promise):

1. Fields on `SelectedTopicContext`
2. `ContentBrainContext` (Brand Core / Lab context)
3. Title-parse fallback (`parseTopicSubjectFromTitle`) — **does not** mutate `masterTitle`

### Category → framingStrategy (structural)

| TopicCategoryId | ObjectiveFramingStrategy |
| --------------- | ------------------------ |
| `product_education` | `education_process` |
| `offers_conversion` | `value_differentiation` |
| `customer_questions` | `decision_criteria` |
| `trust_proof` | `trust_credibility` |

Lineage stores both: `{ objective, framingStrategy }`. Tests assert strategy by enum equality — not word-hunting in copy.

### ContentAngle set (exactly six)

`beginner_guide` | `faq` | `problem_solution` | `decision_guide` | `comparison` | `trust_transparency`

Acceptance: `new Set(variations.map(v => v.angle)).size === 6`.

## Claims rule

**Allowed:** reframe audience, offer, pain, and value already present in selected topic / brand context.

**Forbidden:** invent capability, measurable result, market position, price, guarantee, customer result, or evidence claim not in inputs.

Fixtures carry an `absentCapability` string; generated copy must never contain it.

## Fixtures (test-only)

```text
src/brain/content/__fixtures__/direction-writing/
  supplement-comparison.json
  professional-service.json
  software-product.json
```

- Used by `direction-writing-hardening.test.ts` and as the source of before/after examples below.
- **Production generation must never import or load these files** (guarded by test).

## Before / after (from fixtures)

### Before (pre-hardening failure mode)

Master titles were treated as prose to reverse-engineer. Typical defects:

- Awkward glue: `about How…` / `about Why…` / `about What…`
- Domain nouns invented or hard-coded to one vertical
- Same construction path regardless of objective (no structural `framingStrategy`)
- Trim/normalize of `masterTitle` at Zod or use-case boundaries

Example bad shape (illustrative of the old path, not live code):

```text
Master: How to evaluate Supplement search before buying
Direction: A guide about How to evaluate Supplement search before buying for buyers
```

### After — supplement-comparison (`product_education` → `education_process`)

| Field | Value |
| ----- | ----- |
| master (exact) | `How to evaluate Supplement search before buying` |
| topicSubject | `evaluating Supplement search` |
| framingStrategy | `education_process` |

Directions (punchlines):

1. `[beginner_guide]` A practical starting guide to evaluating Supplement search
2. `[faq]` Questions Shoppers comparing supplements before buying ask before trusting Supplement sea…
3. `[problem_solution]` Why evaluating Supplement search feels hard — and a clearer path
4. `[decision_guide]` Five checks before relying on Supplement search
5. `[comparison]` What matters when comparing Supplement search
6. `[trust_transparency]` What Zynava will and will not claim about evaluating Supplement search

Absent capability never present: `lab-certified medical dosing advice`.

### After — professional-service (`offers_conversion` → `value_differentiation`)

| Field | Value |
| ----- | ----- |
| master (exact) | `How to structure a fundraising narrative` |
| topicSubject | `structure a fundraising narrative` |
| framingStrategy | `value_differentiation` |

Sample punchlines: starting guide / FAQ / problem-solution / five checks / comparison / trust transparency — all grounded in Northline Advisors + fundraising readiness offer. Absent: `guaranteed term-sheet outcomes`.

### After — software-product (`customer_questions` → `decision_criteria`)

| Field | Value |
| ----- | ----- |
| master (exact) | `How to debug failed webhook deliveries` |
| topicSubject | `debug failed webhook deliveries` |
| framingStrategy | `decision_criteria` |

Sample punchlines grounded in ParcelKit webhook retry console. Absent: `zero-latency global CDN acceleration`.

## Test matrix

| Case | Where |
| ---- | ----- |
| FramingStrategy map for all four TopicCategoryId values | `direction-writing-hardening.test.ts` |
| Exact master incl. awkward punctuation | same |
| Three category fixtures: 6 angles, no `about How/Why/What`, absent capability | same |
| deepFreeze: selected + writing context not mutated | same |
| Production modules do not import `__fixtures__/direction-writing` | same |
| Idea Lab lineage: `framingStrategy`, `writingContextVersion`, `generatorVersion` v2 | `idea-lab.test.ts` |

Command:

```bash
npx tsx --test src/brain/content/direction-writing-hardening.test.ts src/brain/evaluation/idea-lab.test.ts
```

## Boundaries (this slice)

**In scope:** structured handoff, writing context, deterministic generator v2 copy path, Lab lineage, test fixtures, this doc + ADR 0003.

**Out of scope / do not touch here:**

- Topic-candidate generator behavior (separate relevance slice)
- Activating `intelligent-v1` as Lab default
- Creating ContentAtoms
- Invoking channel specialists or publish
- Writing product topic history (`topic-generation-history.csv`)
- Human top-3 ranking UX

## Main Brain migration notes

When product Marketing Topic adopts the same handoff:

1. Build `SelectedTopicContext` from the locked master (typed topic or selected candidate) — never from a re-parsed display string alone.
2. Call `buildDirectionWritingContext` once; pass `writingContext` into the Directions provider request.
3. Keep Zod refine-without-trim-assign on `masterTitle`.
4. Persist `framingStrategy` + `writingContextVersion` + `generatorVersion` on generation records when product lineage catches up (Lab already records them).
5. Do not load Idea Lab fixtures in product paths; use Brand Core / company CSV only.
6. Provider id stays `deterministic-v1` until a new baseline ADR; bump `DIRECTIONS_GENERATOR_VERSION` / lineage generator version for copy-path changes.

## Related

- [`CONTENT_BRAIN.md`](./CONTENT_BRAIN.md) — product Directions pipeline
- [`CURRENT_STATE.md`](./CURRENT_STATE.md) — Idea Lab live status
- [`src/app/dev/brain/idea-lab/SANDBOX.md`](../src/app/dev/brain/idea-lab/SANDBOX.md) — Lab sandbox rules
- ADR 0002 — provider baseline freeze
- ADR 0003 — SelectedTopicContext decision
- ADR 0004 — TopicCategoryId model (upstream of directions)

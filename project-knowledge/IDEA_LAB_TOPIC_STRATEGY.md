---
title: Idea Lab — objective topic strategy
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-29
related_paths:
  - src/brain/content/topic-category.ts
  - src/brain/evaluation/generate-topic-candidates.ts
  - src/brain/evaluation/gtc/
  - src/brain/evaluation/gtc/llm-candidates/
  - src/brain/evaluation/gtc/topic-title-hook/
  - src/brain/evaluation/industry-research/
  - src/brain/evaluation/objective-topic-strategies.ts
  - src/brain/evaluation/topic-subject.ts
  - src/brain/evaluation/topic-candidate-types.ts
  - src/brain/use-cases/run-idea-lab-topic-candidates.ts
  - src/brain/use-cases/ild/
  - src/engine/discovery/crawl-website.ts
  - project-knowledge/DECISIONS/0004-topic-category-model.md
---

# Idea Lab — topic category strategy

## Topic categories (four chips — ADR 0004)

Canonical ids in `src/brain/content/topic-category.ts`:

| TopicCategoryId | Job |
| --------------- | --- |
| `customer_questions` | Answer published FAQs and decision uncertainty |
| `product_education` | Teach the category the company operates in |
| `trust_proof` | Show verifiable credibility already on the site |
| `offers_conversion` | Make terms of doing business legible |

Retired `MarketingFocus` values migrate via `parseTopicCategory`. **Awareness is out of scope** — no fifth chip, no ungrounded “brand awareness” copy in the generator.

## Three layers (locked)

| Layer | Role | May produce | Must not |
|-------|------|-------------|---------|
| Brand truth (Discovery/CSV) | Company ledger | `catalogProducts`, brand evidence | Invented SKUs from web |
| Industry research (Perplexity) | Typed expander | `IndustryResearchOpportunity[]` + `industry_research` evidence | `TopicCandidate`, `catalog_product`, scores, completeness |
| Sole candidate generator | Ranking | `TopicCandidateGenerationResult` | Dual generators |

```text
Perplexity → IndustryResearchOpportunity[] → topic-subject classification
  → categoryTopicStrategies → shared scoring / support keys → TopicCandidateGenerationResult
```

Named ingredients from industry evidence: `kind: ingredient_or_component` + `sourceType: industry_research` — **never** `catalog_product`, never “brand sells X”.

`INDUSTRY_RESEARCH_ENABLED=false` leaves the original deterministic candidate flow intact. Live Perplexity calls require `INDUSTRY_RESEARCH_LIVE=true` (CSV industry rows still feed without live calls).

## Canonical path (sole public entry)

```text
runIdeaLabTopicCandidates
  → selectEvidenceForCategory (category-preferred evidence)
  → gtc/llm-candidates/fetch   (optional LLM stage — see below)
  → generateTopicCandidates    (generate-topic-candidates.ts — only public entry)
      when llmCandidates present: map → score → assemble
      else deterministic:
        classifyContextSubjects + optional industry subjects
        → buildObjectiveTopicSeeds
        → gtc/frameCandidates          (educational frame-title)
        → gtc/applyTopicTitleHooks     (topic-title-hook — Hooked Trigger)
        → gtc/scoreCandidates
        → gtc/assembleCandidateResult (distinct grounded support keys + display-intent gate)
  → TopicCandidateGenerationResult
```

Internal modules under `gtc/` are not alternate generators. Industry research is not a second topic generator.

### LLM candidate stage (Partial)

Before the deterministic path, Idea Lab calls `fetchLlmTopicCandidates` with evidence selected for the chosen category. When OpenAI returns validated candidates, `generateTopicCandidates` maps them through scoring and assembly **instead of** seed/framing. On missing API key, empty evidence, validation failure, or empty response, the run **falls back deterministically** with no user-visible error.

| Policy key | Model default | Env override |
| ---------- | ------------- | ------------ |
| `topicLlmCandidates` | `gpt-5.4-nano` | `OPENAI_TOPIC_CANDIDATES_MODEL` |

Lineage records `llmUsed` vs `deterministicFallbackUsed` on the Lab result.

**Completeness filters:** Grounded support-key uniqueness remains the grounding source of truth. Display-intent uniqueness is an **additional** final-set quality gate (primary subject family + attribute/action bucket) — it does not replace or redefine support keys. `complete` / `limited` are decided after both filters.

## Hook Model ownership (do not mix)

| Name | Layer | Hooked stage | Output |
|------|-------|--------------|--------|
| `frame-title` | `gtc/frame-title` | — | Educational title before itch |
| `topic-title-hook` | `gtc/topic-title-hook` | **Trigger** (external) | Scroll-stopping **candidate titles**; `titleHookVersion` / `titleItchType` |
| `hook-enrichment` | `content/hook-enrichment` | **Variable Reward** | Direction **punchlines** after topic selection |

| Layer | Owns | Must not |
|-------|------|----------|
| `topic-subject.ts` | Classify nouns (`classifyContextSubjects` orchestrator + extractors under `subjects/`) | Frame titles / Hooked copy / score |
| `gtc/llm-candidates/` | Optional LLM candidate titles from category-filtered evidence | Change kind / evidence / support keys without validation |
| `gtc/frame-title` | Educational frame only | Hooked itch |
| `gtc/topic-title-hook` | Candidate title Trigger (deterministic path) | Change kind / evidence / support keys |
| `content/hook-enrichment` | Direction punchline polish | Rewrite `masterTitle` / whole card |
| `ild/` | Idea Lab directions helpers | Alternate public entry (use `run-idea-lab-directions.ts`) |

Support keys stay seed/subject-based — title framing and hooks must not unlock completeness. Default title hooks are deterministic templates. `TOPIC_TITLE_HOOK_PROVIDER=openai` is **remapped to deterministic** (OpenAI title-hook path is not live). Direction punchline polish is separate (`HOOK_ENRICHMENT_PROVIDER=openai`). The former **topic-title-polish** module (`TOPIC_TITLE_POLISH_*`) has been removed from the codebase — it was never wired into the live candidate pipeline.

| Result | Meaning |
| ------ | ------- |
| `success` + `completeness: "complete"` | Exactly **six** candidates with distinct support keys **and** distinct display-intent keys (framing/title shells alone cannot unlock complete) |
| `success` + `completeness: "limited"` | **1–5** honest candidates after both filters — never padded |
| `insufficient_context` | No grounded product category, ingredient, catalog product, or comparison attribute |

## Kind doctrine (split)

| Kind | Product education? |
|------|-------------------|
| `product_category` | Yes (category-level) |
| `catalog_product` | Yes — **only** from typed `catalogProducts` / validated `catalogProduct` evidence |
| `ingredient_or_component` | Yes — **only** with positive evidence |
| `health_outcome` | Yes — **optional enrichment** from wellness outcome rows (`extractOutcomeSubjects`); seeds Product Education when present; never substitutes for catalog or FAQ grounding |
| `comparison_attribute` | Yes |
| `platform_capability` | **Not primary** |

**Source field ≠ kind.** `products[]` never auto-becomes `catalog_product`. FAQ/knowsAbout are not auto-products.

## Scoring (`topic-candidate-score-v2`)

Weighted overall (non-saturating):

```text
overall =
  objectiveAlignment × 0.18 +
  subjectKindFit × 0.16 +
  contextGrounding × 0.14 +
  audienceRelevance × 0.10 +
  evidenceGrounding × 0.12 +
  specificity × 0.12 +
  novelty × 0.10 +
  clarity × 0.08
```

Product education + `platform_capability` → hard `subjectKindFit ≈ 0.05`.

Industry research subjects score slightly lower (weaker category connection / low confidence / medical language). Completeness still requires **six distinct grounded support keys** — research volume cannot fake complete; same research page family shares one support key.

## Discovery company-truth path

- Crawl: max **10** successful pages **and** max **24** fetch attempts; `how_it_works` kind; ≤3 catalog pages; second-hop only from about/products; same-origin redirects.
- First-class `catalogProducts` on BrandProfile + ContentBrainContext + CSV — never flatten into `products[]`.
- Discovery LLM default: `gpt-5.4-nano` via `OPENAI_DISCOVERY_MODEL` (Discovery only).

## History

Candidate generation **never** writes Lab topic-use history.

## Related

- [`IDEA_LAB_DIRECTION_HARDENING.md`](./IDEA_LAB_DIRECTION_HARDENING.md)
- [`CONTENT_BRAIN.md`](./CONTENT_BRAIN.md)
- ADR 0004 — TopicCategoryId model

---
title: ADR 0004 — Topic Category Model
status: accepted
authority: supporting
owner: product
last_verified: 2026-07-29
related_paths:
  - src/brain/content/topic-category.ts
  - src/brain/evaluation/objective-topic-strategies.ts
  - src/brain/evaluation/subjects/classify.ts
  - src/engine/discovery/extract-offers.ts
  - project-knowledge/DOMAIN_GLOSSARY.md
---

# ADR 0004 — Topic Category Model

## Context

Idea Lab topic generation previously used five `MarketingFocus` values that mixed funnel stages with editorial jobs. That made evidence selection ambiguous (two objectives could prefer the same fields), encouraged invented “awareness” copy not grounded in company CSV, and blurred three different meanings of **offers** in the codebase (catalog SKUs, platform capabilities, and published commercial terms).

Discovery also leaked catalog product names into CSV `offer` rows and treated page headings as `services[]`, which downstream topic and narrative code interpreted as transacting terms.

## Decision

1. **Four topic categories replace MarketingFocus for generation.** Canonical ids in `src/brain/content/topic-category.ts`:
   - `customer_questions` — answer published FAQs and decision uncertainty
   - `product_education` — teach the category the company operates in
   - `trust_proof` — show verifiable credibility already on the site
   - `offers_conversion` — make terms of doing business legible

2. **Categories map to Hook Model phases for title-hook / itch typing only.** The mapping is cyclical so `itchType` survives across the loop; categories are *jobs*, not a linear funnel:
   - Customer Questions → **Trigger** (open the loop with a real question)
   - Product Education → **Action** (teach something the reader can act on)
   - Trust & Proof → **Variable Reward** (deliver credible payoff)
   - Offers & Conversion → **Investment** (clarify cost, commitment, next step)

   > **Succession (2026-07-29, Topic Generator health audit P2.3):** the direct category→phase table above is no longer a code construct. `topic-title-hook` now selects shells by `TopicTitleItchType` (`missing_detail` / `uncertainty` / `anticipation` / `ability_cue`) conditioned on **subject kind** (`KIND_SHELL_FAMILIES` in `gtc/topic-title-hook/templates.ts`) — buy/compare "check" shells only reach buyer-comparable kinds, and `offers_conversion` additionally bans product-education check phrasing unless attribute-grounded. The intent of this decision (Hook-phase itch typing per category job, no awareness chip) still holds; the mechanism is subject-kind-conditioned.

3. **Awareness is explicitly out of scope for the topic generator.** Brand awareness remains in Content Universe / narrative layers where editorial framing is allowed. Topic chips must not invent claims absent from approved CSV.

4. **ContentAngle is a different layer.** After a topic is selected, `deterministic-v1` still emits six fixed `ContentAngle` variants for directions (ADR 0003). Categories choose *what job* the topic does; angles choose *how* the direction is framed within that job.

5. **Outcome subjects are optional enrichment.** Health/wellness outcome rows (`extractOutcomeSubjects`) may seed Product Education when present; they are not required for every company and never substitute for catalog or FAQ grounding.

6. **Offer-as-relation, not offer-as-SKU.** Commercial terms are modeled like schema.org inverses: `Offer.itemOffered` points at a `Product`; `Product.offers` is the inverse. Catalog names live in `indexedProducts` / `indexedProduct` evidence; commercial mechanics (price, guarantee, trial, shipping) live in `commercialTerms` / CSV `offer` rows only when `isCommercialTerm()` passes. Catalog names are structurally excluded from offer extraction.

7. **Three meanings of “offers” in this codebase:**
   - **Catalog / indexed product** — SKUs or ingredients the company indexes or sells (`indexedProducts`, `indexedProduct` evidence)
   - **Platform capability** — what the business *does* (`products[]`, curated capabilities); classified as `platform_capability`, not an offer row
   - **Commercial term** — published transacting mechanics (`commercialTerms`, CSV `record_type=offer`); may be empty (`offers: []`) with diagnostic `no_published_commercial_terms`

8. **Structural offer extraction from DOM/crawl is deferred.** `collectOfferHints` reads headings, product copy, and CTAs with a commercial-term vocabulary gate; dedicated DOM/JSON-LD offer scraping is future work.

9. **Published CSV invariant.** No `offer` row value may equal any `indexedProduct` name for the same company (`assertOfferRowsDisjointFromCatalog`).

10. **`services[]` must not be backfilled from page headings.** Marketing section titles (e.g. “Why Zynava Exists”) are educational/trust copy, not service lines.

## Consequences

- Idea Lab renders four chips with distinct evidence preferences; legacy `MarketingFocus` values migrate via `parseTopicCategory`.
- Zynava and similar comparison platforms can run Offers & Conversion topics from capabilities and FAQs without fake `offer` rows.
- Empty commercial terms surface `no_published_commercial_terms` instead of inventing discounts or shipping claims.
- Topic title hooks keep Hook-phase itch types aligned to category intent without reintroducing a fifth “awareness” chip.
- ADR 0003 direction handoff unchanged; category only affects topic seeding and evidence select upstream.

## Alternatives considered

- **Keep five MarketingFocus values** — rejected; awareness and value_proposition duplicated conversion work and encouraged ungrounded copy.
- **Treat catalog names as offers for ecommerce sites** — rejected; mislabels ingredients as purchase terms and breaks CSV invariants.
- **Populate `services[]` from headings for “richer profiles”** — rejected; headings are not service inventory and polluted platform-capability classification.
- **Bump direction provider id** — rejected; category change is upstream of ADR 0002’s `deterministic-v1` baseline.
- **Immediate DOM offer scraper** — deferred; vocabulary-gated hints plus manual CSV curation sufficient for current fixtures.

---
title: Domain Glossary
status: active
authority: canonical
owner: product
last_verified: 2026-07-30
related_paths:
  - project-knowledge/CONTENT_BRAIN.md
  - project-knowledge/PRODUCT.md
  - src/brain/**
---

# Domain Glossary

Canonical terminology for MarketMonth Content Brain and product loop. Prefer these spellings in code comments, UI, and docs.

| Canonical term | Definition | Use when | Prohibited alternatives |
| -------------- | ---------- | -------- | ----------------------- |
| Brand Core | Compiled runtime brand knowledge (identity, audience, offers, claims, evidence, safety) | Content generation SoT | “Brand Code”, treating CSV as SoT |
| Ingest helper | CSV, UI input, or Discovery path that feeds Brand Core | Describing loaders | Calling CSV a living doctrine doc |
| Content Brain | Connected staged content system (directions → atom → channels) | System name | Autonomous multi-agent swarm |
| Content Universe | Coordinated asset family under one strategy topic | Product promise | Unrelated post batch |
| Content Angle | One of six fixed editorial angles for directions | Six-idea differentiation | Random title synonym |
| Topic category | One of four marketing jobs for Idea Lab topic chips (`customer_questions`, `product_education`, `trust_proof`, `offers_conversion`) | Topic generation objective | MarketingFocus (legacy), funnel stage |
| Product | Platform capability or deliverable the company provides (`products[]`, curated capabilities) | Discovery profile, platform_capability subjects | Catalog SKU, commercial term |
| Service | Reserved for declared service lines; not page headings | Future structured extraction | Marketing section titles |
| Catalog | Indexed sellable or browsable item (`indexedProducts`, `indexedProduct` evidence) | Product education, SEO opportunities | Offer row, commercial term |
| Commercial term | Published transacting mechanic (price, guarantee, trial, shipping) | CSV `offer` rows, `commercialTerms` on Brand Core | Product name, capability copy |
| Content Atom | Channel-neutral strategic package (`content-atom-v2`) | After direction select | Platform caption dump |
| Craft DNA | Shared operational craft clauses + optional fact-locked atom polish (`CRAFT_DNA_VERSION`) | Atom / topic / discovery writing stages | Copyrighted playbook extracts; always-on polish as product default |
| Content Production Bundle | Idempotent Short + Video format packages from a locked atom (`produceContentBundle`); JSON under `production-bundles/` (dev/single-instance; ADR 0006) | Content Studio `/content?atomId=` | Treating Studio Video as `youtubeLong` channel; inventing a second Short edit store |
| YouTubeShortDraft | Normalized Short draft for atom ∥ manual → channel → renderer (`youtube-short-draft.ts`) | Channel service / future PATCH | Parallel ad-hoc UI draft shapes that skip the contract |
| Short duration policy | Default 60s / max 180s in `duration-policy.ts` only | Channel + Studio Short schemas | Duplicating 60/90 literals in schemas |
| limitationsAcknowledgement | Human ack of pipeline-derived atom limitations before approve | Limited atom approve/lock | Approving insufficient/invalid atoms |
| StrategyLock | Semantic immutability for channel specialists | Produce stage | Specialist rewriting strategy |
| generation_id | Canonical run identity | History / handoff | decision_set_id (removed) |
| MarketingFocus | **Retired** five-value objective enum (`brand_awareness`, `value_proposition`, `product_education`, `decision_support`, `trust_authority`); migrates via `parseTopicCategory` | Legacy runs / stored payloads only | Using as canonical topic objective — use **Topic category** (`TopicCategoryId`) per ADR 0004 |
| Zynava | Active development brand spelling | Fixtures / demos | Zaneva |
| Project Knowledge | `project-knowledge/` eng/product doctrine OS | Agents / Cursor | Injecting wholesale into prompts |
| reference-library | Noncanonical research library (maps via index.yaml; not RAG) | Ignore for SoT; promote via PROMOTION.md | Treating as MarketMonth runtime |
| Refrence folder | Legacy name for reference-library (spelling was intentional) | Dual-blocked ignore; prefer reference-library | Treating as MarketMonth runtime |

See also: [`CONTENT_BRAIN.md`](./CONTENT_BRAIN.md), [`PRODUCT.md`](./PRODUCT.md).

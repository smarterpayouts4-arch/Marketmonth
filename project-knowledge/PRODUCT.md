---
title: MarketMonth Product
status: active
authority: canonical
owner: product
last_verified: 2026-07-28
verified_against_commit: 4a2dc0a
related_paths:
  - project-knowledge/PRODUCT.md
  - project-knowledge/CURRENT_STATE.md
related_features:
  - discovery-engine
---

# PRODUCT (MarketMonth) — product authority

> **This file is the unequivocal product SoT.**  
> Other docs point here; they do not redefine the loop.  
> MarketMonth is a **customer- and industry-agnostic** AI marketing operating system.
> It learns each business and generates strategy from that business’s own context —
> not from a fixed vertical, catalog, or brand.

## MARKETMONTH NORTH STAR

Turn a handful of good monthly ideas into an entire
coordinated content system, then learn from what performed.

## PRODUCT LOOP

1. LEARN  
   Understand the business.

2. STRATEGIZE  
   Decide what the business should talk about.

3. CONTENT UNIVERSE  
   Turn each strong idea into a coordinated content family.

4. PRODUCE  
   Generate platform-appropriate assets.

5. REVIEW + SCHEDULE  
   Human approves the month.

6. PUBLISH + LEARN  
   Measure results and improve the next cycle.

## Product invariant

**MarketMonth is strategy-first, not asset-first.**

Do **not** treat a Content surface as “build an AI Instagram post generator.” Correct chain:

```text
This post belongs to a strategic topic
  → which belongs to a monthly pillar
  → which belongs to the company's learned business context
```

That chain is the product advantage.

## Content Universe (first-class term)

One **Strategy Topic** becomes a coordinated family — never “40 unrelated pieces.”

```text
Strategy Topic
      ↓
Core Narrative
      ↓
Content Universe
 ├─ Carousel
 ├─ Short
 ├─ LinkedIn
 ├─ Facebook
 ├─ X
 ├─ Blog
 ├─ Graphics
 └─ Long-form video
```

**Definition:** One strategic topic becomes a **coordinated family of assets**, never a collection of unrelated pieces. A Content Universe is that family — platform-adapted assets sharing one core narrative under one strategic topic for that business’s monthly plan.

Use the phrase **Content Universe** in plans, UI naming, and code comments when referring to this concept.

## Who the customer is

- **The owner / marketer of any business** (local shop, SaaS, agency, ecommerce, etc.).
- Learn ingests *that company’s* website and context.
- Pillars, topics, and Content Universes are **per-business**.
- Optional later pilots or demo brands are **tenants**, not MarketMonth’s identity.

## Stage detail (pointers)

| Stage | Owner job | Typical inputs | Typical outputs |
|-------|-----------|----------------|-----------------|
| LEARN | Give the system the business | Website / about / products / FAQs / audience / brand / competitors / value prop | Business context profile |
| STRATEGIZE | Approve what to talk about this month | Business context + pillars (education, awareness, problem/solution, FAQs, trust, comparison, conversion, …) | Monthly pillars + strategy topics |
| CONTENT UNIVERSE | See the family for each topic | Strategy topic + core narrative | Coordinated asset plan across channels |
| PRODUCE | Generate assets | Content Universe plan | Visuals, scripts, scenes, captions, CTAs |
| REVIEW + SCHEDULE | Approve ~a month in ~two hours | Produced assets | Calendar populated |
| PUBLISH + LEARN | Improve next cycle | Analytics from connected accounts | “What worked” → next month’s strategy |

## Agent reasoning pattern

When implementing a feature, map it to a loop stage first, then to the owning surface (see `ARCHITECTURE.md`). Check `CURRENT_STATE.md` for what is actually live.

Example: *“Strategy page should show what the company should talk about this month.”*

```text
Substantial request
  → CURRENT_STATE + this PRODUCT.md
  → Recognize STRATEGIZE
  → Check ARCHITECTURE (strategy module)
  → Output feeds Content Universe
  → Scoped plan → implement → verify
```

## Forbidden framing

- Framing MarketMonth as one customer’s internal tool
- Baking a specific catalog, medical, or commerce vertical into product doctrine
- Asset-first generators disconnected from Learn → Strategize → Content Universe

## Canonical sources

- This file — product authority
- [`CURRENT_STATE.md`](./CURRENT_STATE.md) — what is functional today
- [`docs/START_HERE.md`](../docs/START_HERE.md) — human cold start
- [`BRAND_CHANGE_MAP.md`](./BRAND_CHANGE_MAP.md) — public naming / domain treatments (A/B/C)

---
title: Discovery Engine
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-27
related_paths:
  - src/engine/discovery/**
  - src/app/api/discovery/**
  - src/components/discovery/**
related_features:
  - discovery-engine
---

# FEATURE: Discovery Engine

## Purpose

LEARN-stage pipeline: website → crawl → brand/SEO/social/competitor signals → Brand Profile + strategy draft.

## Activation Hook (UI)

Market Month’s **discovery activation Hook** (not the finished habit loop):

1. **Trigger** — uncertainty about what the brand should lead with  
2. **Action** — paste one URL → Analyze  
3. **Variable reward** — four progressive reveals (owner-facing): Customer Value → Buyer Moment → Lead Offer → Growth Direction (internal ids: `brand-core` / `buyer-tension` / `lead-offer` / `growth-opening`)  
4. **Investment** — only choices that improve the plan (required: growth direction). Navigation / view / empty confirm ≠ investment; `brandCoreEdit` only when the owner edits or replaces wording.

**Grounded pipeline:** crawl → Brand Profile → engine `buildDiscoveryActivationProfile` (`src/lib/discovery/activation-profile.ts` contract) → UI formats only via `toDiscoveryActivation`. Extract hygiene strips scripts/JSON-LD before offer hints; insights/evidence follow a complete-sentence rule (omit junk, never hard-clip mid-clause). Presentation must not invent Buyer Moment / Lead Offer / Growth options. Low evidence → clarification copy + neutral fallbacks marked `confidence: "low"`.

Presentation models live under `src/components/discovery/activation/` (`DiscoveryReveal`, `DiscoveryInvestments`, adapter to `StrategyIntentAnswers`). UI must not import `@/engine`. Progress is header-only (`YOUR DISCOVERY · n OF 4`); tabs are label-only with checkmarks only after real selection.

Honest evidence groups: Observed / Interpreted / Recommended (site-tied or omitted). Channel copy uses **detected / not detected on the website**, never “missed” as absence fact. Product crawl Playwright is in-process (`src/lib/discovery/browser/`); Docker MCP Playwright is agent-only.

### Activation funnel metrics (instrument when analytics land)

- Analyze completion rate  
- Time until first dominant insight visible  
- Reveal progression rate  
- Revisit rate for completed reveals  
- Customer Value refinement rate  
- Buyer Moment selection rate  
- Lead Offer override rate  
- Growth Direction selection rate  
- Plan-generation conversion  
- Later edit of selected direction  
- Strategy acceptance / approval after generation  

## Ownership

| Layer | Path |
|-------|------|
| Engine | `src/engine/discovery/` |
| API | `src/app/api/discovery/` |
| UI card | `src/components/discovery/` (HTTP client only) |
| Activation presentation | `src/components/discovery/activation/` |

## Boundaries

- UI must not import engine modules.
- Engine must not import React / Next UI.
- Strategy output is a **draft** requiring human review (see PRODUCT invariant).
- Do not declare discovery “Hook-complete” — recurring publish/learn habit is separate.

## Status

See [`CURRENT_STATE.md`](../CURRENT_STATE.md) → Discovery.

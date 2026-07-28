---
title: MarketMonth Design System
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-24
related_paths:
  - src/app/globals.css
  - src/components/ui/**
---

# DESIGN-SYSTEM

## Color SoT

All colors and brand-adjacent tokens come from [`src/app/globals.css`](../src/app/globals.css).

- CSS variables (`--primary`, `--warm`, `--background`, etc.) and `@theme inline` mappings
- Landing and every app tab consume tokens
- **Do not** hard-code feature-local brand palettes

## Typography / UI

- Display / UI fonts in root layout
- Shared primitives: `src/components/ui/`, `src/components/shared/`

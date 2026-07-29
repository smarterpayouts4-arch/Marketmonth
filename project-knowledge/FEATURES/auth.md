---
title: Auth
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-28
related_paths:
  - src/auth.ts
  - src/lib/auth/**
  - src/app/api/auth/**
  - src/components/providers/auth-session-provider.tsx
related_features:
  - auth
---

# FEATURE: Auth

## Purpose

Auth.js session layer for MarketMonth app surfaces, with Neon-backed persistence when `DATABASE_URL` is set. Not a completed multi-tenant security product — Partial hardening.

## Ownership

| Layer | Path |
|-------|------|
| Auth config | `src/auth.ts` |
| Mode helpers | `src/lib/auth/` |
| Route handlers | `src/app/api/auth/` |
| Session provider | `src/components/providers/auth-session-provider.tsx` |

## Boundaries

- Never commit secrets; use `.env.example` only in docs/index.
- Server Actions and API routes that mutate must authenticate inside the handler (not layout-only).
- Discovery persist / brand profiles require DB env — do not assume auth alone implies data Live everywhere.

## Status

See [`CURRENT_STATE.md`](../CURRENT_STATE.md) → Auth + Data (Partial).

---
title: Perplexity API key — setup and rotation runbook
status: active
authority: supporting
owner: engineering
last_verified: 2026-07-29
related_paths:
  - .env.example
  - scripts/perplexity-doctor.ts
  - src/seo/intelligence/providers/perplexity.ts
  - src/brain/evaluation/industry-research/perplexity-expand.ts
  - docs/ai/agent-toolchain.md
---

# Perplexity API key — setup and rotation runbook

Use this when you first wire Perplexity, rotate a key, or debug “Perplexity isn’t working.”

## Current status (2026-07-29)

| Check | Status | Notes |
|-------|--------|-------|
| API key valid (Sonar + Agent API) | **Working** | Direct HTTP probes return 200 |
| MarketMonth `.env` | **Missing** | Next.js does not load the key today |
| Cursor MCP key (`~/.cursor/mcp.json`) | **Configured** | Separate from app `.env` |
| Idea Lab live Perplexity | **Off** | `INDUSTRY_RESEARCH_LIVE` unset |
| Cursor MCP live call | **Verify after restart** | Stale MCP processes can show `401 insufficient_quota` even when the key works |

Re-run anytime:

```bash
npm run perplexity:doctor
```

---

## Two systems, one key

Perplexity is wired in **two independent places**. Updating only `.env` does **not** update Cursor MCP, and vice versa.

```text
┌─────────────────────────────────────────────────────────────┐
│  Perplexity API Console (console.perplexity.ai)             │
│  One API key (pplx-…) + prepaid API credits                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
┌──────────────────────┐        ┌──────────────────────────────┐
│  MarketMonth app     │        │  Cursor MCP (user-level)     │
│  .env / .env.local   │        │  ~/.cursor/mcp.json          │
│  PERPLEXITY_API_KEY  │        │  mcpServers.perplexity.env   │
└──────────────────────┘        └──────────────────────────────┘
           │                               │
           ▼                               ▼
  SEO research, Idea Lab           perplexity_ask / _search /
  /api/seo/refresh                 _research / _reason (Agent API)
```

**Billing reminder:** **API credits** (console.perplexity.ai → Billing) are separate from **Computer Credits** on the consumer Perplexity site. The chat subscription balance does not pay for API calls.

---

## Where the key is read (MarketMonth code)

All runtime usage goes through `process.env.PERPLEXITY_API_KEY`. Nothing in `src/` hardcodes a key.

| Consumer | File / entry | API surface |
|----------|--------------|-------------|
| SEO research provider | `src/seo/intelligence/providers/perplexity.ts` | Sonar `chat/completions` |
| Idea Lab industry research | `src/brain/evaluation/industry-research/perplexity-expand.ts` | Same Sonar provider |
| SEO refresh route | `POST /api/seo/refresh` (when `auditsOnly: false`) | Same provider |
| SEO CLI | `npm run seo:review:full` | Same provider |

Optional related env vars (unchanged during key rotation unless you want different behavior):

| Variable | Default | Purpose |
|----------|---------|---------|
| `PERPLEXITY_SEO_MODEL` | `sonar` | Model for SEO + industry research |
| `PERPLEXITY_SEO_TIMEOUT_MS` | `45000` | Request timeout |
| `INDUSTRY_RESEARCH_ENABLED` | enabled | Set `false` to disable industry research |
| `INDUSTRY_RESEARCH_LIVE` | **off** | Set `true` for live Perplexity in Idea Lab |

Documented in [`.env.example`](../../.env.example).

---

## What you must update when rotating a key

When you get a new `pplx-…` key, update **both** locations below, then restart services.

### 1. MarketMonth app — required for Next.js / scripts

**File:** `.env` or `.env.local` (gitignored; create from `.env.example` if missing)

```env
PERPLEXITY_API_KEY=pplx-NEW_KEY_HERE

# Optional — only if you want live Idea Lab Perplexity calls
# INDUSTRY_RESEARCH_LIVE=true
```

**Restart:** stop and restart `npm run dev` (or redeploy host env vars in production).

### 2. Cursor MCP — required for agent “eyes” in Cursor

**File:** `~/.cursor/mcp.json` (Windows: `%USERPROFILE%\.cursor\mcp.json`)

```json
{
  "mcpServers": {
    "perplexity": {
      "command": "npx",
      "args": ["-yq", "@perplexity-ai/mcp-server"],
      "env": {
        "PERPLEXITY_API_KEY": "pplx-NEW_KEY_HERE"
      }
    }
  }
}
```

**Restart:** Cursor → Settings → MCP → restart the **perplexity** server (or reload the window).

### 3. Production / hosted deploy (when applicable)

If MarketMonth is deployed with env vars on Vercel, Railway, etc., update `PERPLEXITY_API_KEY` in that host’s secret store and redeploy. There is no in-repo production secret file today.

---

## What you do **not** need to update

| Item | Why |
|------|-----|
| Source code under `src/` | Reads env at runtime only |
| `.env.example` | Placeholder stays blank (never commit real keys) |
| `project-knowledge/generated/maps/ENV_MAP.md` | Auto-generated from env scan |
| Workspace `.cursor/mcp.json.example` | MarketMonth Discovery MCP only — no Perplexity key |
| `PERPLEXITY_SEO_MODEL` / timeout / Idea Lab flags | Independent of key rotation |

After rotation, **revoke the old key** in [console.perplexity.ai](https://console.perplexity.ai) → API keys.

---

## First-time setup checklist

1. Create API key at [console.perplexity.ai](https://console.perplexity.ai).
2. Add payment method and buy API credits if balance is zero (API credits ≠ Computer Credits).
3. Copy `.env.example` → `.env`; set `PERPLEXITY_API_KEY`.
4. Set the same key in `~/.cursor/mcp.json` under `mcpServers.perplexity.env`.
5. (Optional) Set `INDUSTRY_RESEARCH_LIVE=true` for live Idea Lab industry research.
6. Run `npm run perplexity:doctor` — expect Sonar + Agent API PASS.
7. Restart Cursor MCP if agent Perplexity tools still fail.

---

## Key rotation checklist (future)

Use this exact order to avoid downtime:

- [ ] **Generate** new key in Perplexity API Console (keep old key active briefly).
- [ ] **Update** `PERPLEXITY_API_KEY` in MarketMonth `.env` / `.env.local`.
- [ ] **Update** `PERPLEXITY_API_KEY` in `~/.cursor/mcp.json`.
- [ ] **Update** host secrets if deployed.
- [ ] **Restart** Next.js dev server (or redeploy).
- [ ] **Restart** Cursor MCP perplexity server.
- [ ] **Verify** `npm run perplexity:doctor` — all API probes PASS.
- [ ] **Verify** Cursor: run a `perplexity_ask` tool call in chat.
- [ ] **Verify** app (optional): `npm run seo:review:full` or Idea Lab with `INDUSTRY_RESEARCH_LIVE=true`.
- [ ] **Revoke** old key in Perplexity console.

---

## Verification commands

```bash
# Full config + live API probes (safe — never prints the key)
npm run perplexity:doctor

# SEO pipeline with live Perplexity (requires .env key)
npm run seo:review:full

# SEO audits only — no Perplexity key required
npm run seo:review
```

### Expected doctor output (healthy)

- `MarketMonth .env / .env.local` — PASS
- `PERPLEXITY_API_KEY loaded` — PASS
- `Sonar chat/completions (MarketMonth runtime)` — PASS
- `Agent API preset=fast (Cursor MCP perplexity_ask)` — PASS

`INDUSTRY_RESEARCH_LIVE` FAIL is normal unless you intentionally enabled live Idea Lab research.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `401 insufficient_quota` | Empty or locked API credits | Buy credits at console.perplexity.ai → Billing |
| MCP fails but doctor PASS | Stale Cursor MCP process | Restart perplexity MCP server |
| App fails but MCP works | Key only in `mcp.json`, not `.env` | Add key to `.env`; restart dev server |
| Idea Lab never calls Perplexity | Flag off | Set `INDUSTRY_RESEARCH_LIVE=true` |
| Perplexity returns nothing in Idea Lab | Silent catch on error | Run `npm run perplexity:doctor`; check credits |
| Dashboard shows $10 but “add $5” | Promotional / trial unlock UI | Purchase credits in **API** console, not chat billing |
| Confusing “$9.99/day” balance | Computer Credits (consumer) | Ignore for API; check API console balance |

Official billing: [Perplexity API payment and billing](https://www.perplexity.ai/help-center/en/articles/10354847-api-payment-and-billing.html).

---

## Related docs

- [Agent toolchain](./agent-toolchain.md) — when agents should use Perplexity (advisory)
- [Discovery MCP](./mcp.md) — workspace MCP (MarketMonth `mm_*`; separate from user Perplexity MCP)
- [Idea Lab topic strategy](../../project-knowledge/IDEA_LAB_TOPIC_STRATEGY.md) — industry research flags and boundaries

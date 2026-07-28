# MarketMonth — Marketing AI

Greenfield Next.js app for a **customer- and industry-agnostic AI marketing operating system**.

Product authority: [`project-knowledge/PRODUCT.md`](project-knowledge/PRODUCT.md) (APS `project-context/` is a pointer only)  
Cold start: [`docs/START_HERE.md`](docs/START_HERE.md)

## Knowledge OS

Canonical product and engineering knowledge lives in [`project-knowledge/`](project-knowledge/README.md) (doctrine, maps, quality dual-score, daily closeout).  
APS (`agent-prompt-system/`) is process only. Start agents at [`AGENTS.md`](AGENTS.md) → [`project-knowledge/README.md`](project-knowledge/README.md) → [`CURRENT_STATE.md`](project-knowledge/CURRENT_STATE.md).

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — `/` is the landing module; app shell under `/dashboard` and other routes.

## Discovery Engine (Phase 1)

- UI: `src/components/discovery/` (fetch only)
- Engine: `src/engine/discovery/` (crawl → parallel analyzers → Brand Profile)
- API: `POST /api/discovery/analyze` (NDJSON stage stream)
- DB: Neon + Drizzle (`npm run db:push`)
- Auth: Auth.js Google for Start Free Trial (`AUTH_SECRET`, `GOOGLE_CLIENT_*`)

Copy `.env.example` → `.env.local` and fill values.

## Notes

- Colors from `src/app/globals.css`
- Landing: `src/components/landing/` (thin `src/app/page.tsx`)
- `reference-library/` is noncanonical research only — not product doctrine (see its README + PROMOTION.md)
- Agent Prompt System: `node agent-prompt-system/scripts/install.mjs` then `validate.mjs`

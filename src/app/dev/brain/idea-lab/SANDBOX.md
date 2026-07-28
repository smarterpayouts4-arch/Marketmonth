# Idea Lab sandbox

Self-contained evaluation surface for the Content Brain Directions path.

## Isolation rules (non-negotiable)

1. Generation only via `/api/dev/brain/idea-lab/*` (`runIdeaLabTopicCandidates` then `runIdeaLabDirections`).
2. Topic history only in `data/runtime/idea-lab-topic-history.csv` — never product `topic-generation-history.csv`.
3. Do not import Marketing Topic product hooks (`useContentDirections`), handoff storage, or Atom/channel routes.
4. Presentational reuse of Marketing Topic UI is allowed; product orchestration is not.
5. Page + APIs are production-impossible (`notFound` / 403).
6. Stops before ContentAtom creation.
7. Auto-generate requires a marketing objective → 6 system-ranked candidates → human selects one → then six directions. Candidates alone do not write Lab topic history.

Visual shell (`AppShell`) is for UX parity only and must not write Lab outcomes into product brand state.

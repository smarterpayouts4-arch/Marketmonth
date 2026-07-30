# Idea Lab sandbox

Self-contained evaluation surface for the Content Brain Directions path, plus
a select→atom review stage that reuses the product Content Atom use case.

## Isolation rules (non-negotiable)

1. Candidate + directions generation only via `/api/dev/brain/idea-lab/*`
   (`runIdeaLabTopicCandidates` then `runIdeaLabDirections`).
2. Topic history only in `data/runtime/idea-lab-topic-history.csv` — never product
   `topic-generation-history.csv`.
3. Do not import Marketing Topic product hooks (`useContentDirections`) or handoff
   storage. Atom stage calls product `/api/brain/content-atom` (+ `/review`) with a
   Lab-built handoff — same use case as Content Studio, not a second atom builder.
4. Presentational reuse of Marketing Topic UI is allowed; product orchestration
   hooks are not.
5. Page + Lab APIs are production-impossible (`notFound` / 403).
6. After direction confirm: build Content Atom → show AtomReviewPanel (approve /
   request changes / back to directions). Channel production stays in Content Studio.
7. Auto-generate requires a marketing objective → 6 system-ranked candidates →
   human selects one → then six directions. Candidates alone do not write Lab
   topic history.

Visual shell (`AppShell`) is for UX parity only and must not write Lab outcomes
into product brand state.

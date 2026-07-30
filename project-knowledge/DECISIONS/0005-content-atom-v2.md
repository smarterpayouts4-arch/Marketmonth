---
title: ADR 0005 — Content Atom v2 and select→atom
status: accepted
authority: supporting
owner: product
last_verified: 2026-07-29
related_paths:
  - src/brain/atom/
  - src/brain/atom/generate.ts
  - src/brain/atom/build-content-atom.ts
  - src/brain/policy/provider-policy.ts
  - src/components/dashboard/content/
  - src/app/dev/brain/idea-lab/
  - scripts/verify-select-to-atom.ts
---

# ADR 0005 — Content Atom v2 and select→atom

## Context

The Content Atom is the channel-neutral strategic SoT between editorial selection and channel specialists. An earlier pipeline LLM path (`pipeline/llm-atom.ts`) and a hollow deterministic belief-shift template produced either unconstrained generation or fake-confident thin atoms. Idea Lab also carried a human evaluation checklist beside an optional LLM-as-judge sampler, which split quality ownership and slowed the select→produce loop.

Product needs one atom model, one model-assisted path, frictionless handoff after a human picks a direction, and specialist work only after explicit atom approval/lock.

## Decision

1. **Content Atom v2 is the sole atom schema.** `schemaVersion: "content-atom-v2"` in `src/brain/atom/content-atom.schema.ts`. Legacy hollow templates and superseded pipeline LLM wrappers are removed.

2. **Constrained LLM is the product primary atom path.** `PRODUCT_ATOM_PREFER_LLM = true`. Generation goes through `src/brain/atom/generate.ts` (`CONTENT_ATOM_GENERATE_SYSTEM`) bound to the build envelope + claim ledger. On failure or thin evidence, the deterministic skeleton returns honest `limited` / `insufficient` status — never filler belief shifts. Offline/tests may pass `preferLlm: false`.

3. **Select → atom is the canonical handoff.** After the human selects one direction (Marketing Topic or Idea Lab), Studio / Lab builds the atom via `/api/brain/content-atom` before channel production. Production consumes a locked `atomId` only (no handoff rebuild).

4. **Approval before channel specialists.** Atoms become specialist-ready only after approve/lock (`approvalStatus` + StrategyLock). There is no human claims checklist that specialists wait on; Gate 1 remains direction selection. Gate 2 Studio package approve remains Partial for multi-package review shells.

5. **No human Idea Lab evaluation checklist.** The Idea Lab evaluation drawer and idea-quality schema are removed. Product history `saveEvaluation` stays intact for a different system.

6. **LLM-as-judge is always-on for Idea Lab.** `judgeTopicCandidates` runs on Lab topic candidate runs without `shouldSampleJudge()` gating. Advisory only — never blocks the run.

7. **Evidence admission is relevance + quality-floor based.** Prefer ∩ library is never shrunk below quality-admitted prefer ids; URLs/addresses/fragments/single-token labels fail the floor; soft ceiling 6–8 is a generation target, not a validity gate. Policy stamp: `EVIDENCE_ADMISSION_POLICY_VERSION`.

8. **Claim capability records replace free-form policy strings** on the build envelope (`claimRuleId`, evidenceIds, permittedMeaning, requiredQualification, prohibitedExpansion). Ledger claims bind to `claimRuleId` when expressed.

9. **Application owns build status.** Model `self_assessed_status` may only demote. Word count / claim count / proof count are targets in prompts and inspector reports — never definitions of validity.

10. **Engagement strategy locks with the kernel; presentation stays mutable.** After lock, `assertKernelImmutable` covers kernel, claim ledger, narrative modules, `engagementBlueprint.strategy`, and `distributionContract`. Flat presentation fields (`creative_mode`, `visual_concept`) may change.

11. **Limited atoms require acknowledged limitations to approve.** Derived from gateResults + `missing_information`; insufficient/invalid never approvable. Review splits **revise this atom** (same contract, full re-run) vs **choose another direction**.

12. **Atom build trace is references + metadata only.** Returned from `buildContentAtom` / handoff; never a second copy of the atom body and never a parallel atom-truth store.

13. **Cost caps distinguish `cap_exceeded` from `cap_store_unavailable`.** Store unavailability always alerts high-severity; production fails closed; non-production fails open after alert. Probe: `probeLlmUsageDailyTable`.

## Consequences

- One model-assisted atom path (`atom/generate.ts`); `pipeline/llm-atom.ts` deleted.
- Studio first-paints atom review; channel packages compile from approved atoms.
- Idea Lab quality signal is judge + golden harness, not a human checklist UI.
- Acceptance gate: `npm run verify:select-to-atom` (static Phase 0/1/2 checks).
- Inspector (`npm run inspect:content-atom`) reports word count and gate summary without gating validity on length.
- Post-ADR: Craft DNA polish is opt-in / fail-closed (`ATOM_CRAFT_POLISH_PROVIDER` or experiment arm B) — not the product default.
- Content Studio YouTube **Video** format packages live under `src/brain/content-studio/` — they are **not** the `channelRegistry.youtubeLong` channel (still `not_connected`).

## Alternatives considered

- **Keep deterministic atom as product default** — rejected; constrained LLM with envelope binding + honest thin fallback is the product path; deterministic remains the offline/test fallback.
- **Human checklist + sampled judge** — rejected; checklist removed; judge always-on in Lab.
- **Rebuild atom inside production route from handoff** — rejected; production is atomId-only after approval.
- **Numeric validity floors (word/claim/proof counts)** — rejected; they incentivize padding; use targets + evidence-bound status instead.
- **Separate atom-trace repository copying the atom body** — rejected; canonical truth stays in AtomRepository; trace is refs only.

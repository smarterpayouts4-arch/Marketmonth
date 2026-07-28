# Verification Contract

Every substantial workflow defines verification **before** claiming success.

## Evidence labels (required in completion reports)

| Label | Meaning |
|-------|---------|
| **Verified** | You ran appropriate checks; evidence supports the claim |
| **Partially verified** | Some checks passed; material gaps remain |
| **Not verified** | Change made (or proposed) without running checks |
| **Blocked** | Could not verify (missing env, secrets, tools, access) |
| **Assumed** | Relied on reasoning/docs without runtime proof — call it out |

## Never

- Say “done,” “fixed,” “fully working,” or “100% complete” without evidence.
- Treat stubs / static audits as production proof when project-context says otherwise.

## Match verification to change type

| Change | Evidence examples |
|--------|-------------------|
| Bug fix | Repro before + after; regression test when practical |
| UI | Breakpoints / interaction states called out by user |
| API | Request/response behavior |
| Data | Representative records / transforms |
| Refactor | Behavior parity (tests or focused manual) |
| SEO | Rendered metadata / structured data / tooling from COMMANDS |
| Performance | Before/after measurement |
| Security | Permission and failure-boundary checks |
| Build/config | Actual build or targeted script |

Prefer commands listed in `project-context/COMMANDS.md`.

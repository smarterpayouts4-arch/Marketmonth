# Workflow Composition

## Limits

- Select **at most three** workflows per request.
- Prefer one strong workflow over a stack of overlapping ones.

## Compatibility

Use each workflow’s `compatible_with` list. Common pairs:

- `plan-feature` → `implement-feature` → `test-and-verify`
- `debug-runtime-problem` + `test-and-verify`
- `audit-existing-system` + `improve-seo-and-llm-readiness` (findings first unless user asked to fix)
- `investigate-codebase` before high-risk `refactor-safely`

## Anti-duplication

| Anti-pattern | Prefer |
|--------------|--------|
| `implement-feature` + full redesign UI workflow for a button tweak | `refine-ui-ux` alone |
| `audit-existing-system` + immediate huge rewrite | Audit first; implement only if asked |
| `onboard-new-project` during normal feature work | Skip onboarding |
| Loading all context “just in case” | Required context only |

## Ordering

1. Investigate / audit / plan (understand)
2. Implement / refine / refactor / optimize (change)
3. Test-and-verify (prove)

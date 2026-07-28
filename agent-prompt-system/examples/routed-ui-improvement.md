# Example: UI cleanup

## Input

```text
This section looks confusing. Clean it up but do not change everything.
It also needs to look right on iPad.
```

## Expected routing

- Primary: `refine-ui-ux`
- Optional: `test-and-verify` if interaction risk is non-trivial

## Interpretation

- UI/UX refinement, not full redesign
- Preserve functionality
- Investigate current component first
- Verify relevant responsive widths (incl. iPad-ish breakpoints)
- Do not modify unrelated pages

## Context to load

From workflow: PROJECT.md, DESIGN-SYSTEM.md, COMMANDS.md

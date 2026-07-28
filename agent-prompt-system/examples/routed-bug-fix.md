# Example: filter regression

## Input

```text
The search worked before, but now this filter gives no results.
Find out what happened and fix it without breaking the other filters.
```

## Expected routing

- `debug-runtime-problem`
- `test-and-verify`

## Interpretation

- Runtime regression
- Reproduce failure
- Trace filtering / data flow
- Identify regression source
- Add or update regression test when practical
- Verify neighboring filter behavior

## Context

PROJECT.md, COMMANDS.md, KNOWN-RISKS.md, DATA-FLOWS.md (+ DEFINITION-OF-DONE via test workflow)

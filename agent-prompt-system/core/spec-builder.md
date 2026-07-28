# Spec Builder

Build a short task specification before large edits. Prefer the shape in `templates/task-spec-template.md`.

## Required fields

| Field | Intent |
|-------|--------|
| `goal` | What success looks like in one sentence |
| `constraints` | Hard limits (do not touch X, preserve Y) |
| `in_scope` | Files/systems allowed |
| `out_of_scope` | Explicit non-goals |
| `acceptance_criteria` | Observable checks |
| `verification_plan` | Commands / manual checks + evidence labels |
| `risk_level` | low / medium / high |
| `selected_workflows` | ≤3 IDs from manifest |
| `required_context` | project-context files loaded |
| `open_questions` | Blockers; ask user if they change scope |

## Rules

- Specs are working notes, not a second product bible.
- If the user already supplied a clear mini-spec, refine it — do not rewrite history.
- High-risk work (auth, secrets, SEO claims, scrapers, ranking) must call out protected areas.
- Verification plan is mandatory for substantial work **before** claiming implementation complete.

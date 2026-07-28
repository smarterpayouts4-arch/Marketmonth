# Safety and Scope

## Precedence (highest first)

1. Explicit current user instruction
2. Safety / security restrictions
3. Repository protected-area + product-boundary rules (see project-context)
4. Existing mandatory project rules (domain `.mdc` rules when their globs apply)
5. Agent Prompt System routing
6. Selected workflows
7. General defaults

**Conflict handling:** surface conflicts; do not silently override product doctrine or safety.

## Surgical changes

- Touch only files needed for the acceptance criteria.
- Avoid drive-by refactors, unrelated formatting, and speculative rewrites.
- Do not expand scope because a workflow *could* also cover it.

## Sources of truth

- Do not duplicate product policy into APS workflows.
- Link to existing SoTs from project-context.
- Shipping product chat prompt policy (if any) is a **different system** from APS — reference it; do not merge it into Cursor workflows.

## Feedback hygiene

Never write secrets, credentials, customer data, private records, or full prompt dumps into `feedback/`. Generalized lessons only.

# Thinking persona router — EXPERIMENTAL

**Lifecycle: EXPERIMENTAL.** Incomplete. Non-authoritative.  
**Load only if the user explicitly requests a persona stance.** Never replace workflow selection. Never load a full registry into always-on rules (no registry is shipped).

## When to attach (optional)

1. User names a persona or alias (`[persona: red_team]`, `Stance: 80/20`, etc.) → honor unless accuracy/safety conflict.
2. Otherwise omit. Do not invent a persona stack.

## Limits

- Exactly **one** primary persona when used.
- At most **two** supporting personas with different jobs.
- If none fit → omit.
- Accuracy overrides persona tone. Never impersonate real public figures.

## State aloud (optional line)

```text
Selected workflows: plan-feature, test-and-verify
Selected personas: leverage_planner (primary)   # EXPERIMENTAL — optional
```

## Registry

`personas/ai_persona_registry.json` is **not present**. Do not invent entries. Human approval is required before activating or deleting the persona system.

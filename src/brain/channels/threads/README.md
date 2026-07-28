# threads channel foundation

Status: `not_connected`

## Shared input
Every specialist receives the same immutable Content Atom identity (`atom_id`, `atom_version`, `message_hash`) plus Brand Core visual identity and platform rules. Specialists never mutate the atom.

## StrategyLock
Packages must pin the shared semantic StrategyLock from `@/brain/strategy-lock`. Rewrite for the platform is allowed; contradicting claim, proof, belief shift, payoff, intended action, or compliance boundaries is forbidden.

## Future package ownership
When enabled, this folder will own `specialist.ts`, `prompt.ts`, channel-specific `package.schema.ts`, validate, and creative plans. Shared provider plumbing stays in `@/brain/render`.

## Current status
This scaffold is intentionally non-operational. `generate()` is not implemented. Studio must show **Adapter not connected yet**. Fake generation is forbidden.

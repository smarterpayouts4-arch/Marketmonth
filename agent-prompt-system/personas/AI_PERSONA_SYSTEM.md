# APS thinking personas — EXPERIMENTAL

**Lifecycle: EXPERIMENTAL (incomplete, non-authoritative).**  
Not installed by `install.mjs`. Not validated as operational infrastructure.  
**Do not treat personas as live Cursor routing.** Workflows remain the spine.

Opt-in cognitive stances for APS when a human explicitly requests a stance. Personas frame *how* to reason on a selected job — they never replace workflow selection.

Machine registry `ai_persona_registry.json` is **not shipped** in this repository.  
Router notes: [`persona-router.md`](./persona-router.md) (also EXPERIMENTAL).

## Precedence

1. Safety / protected rules  
2. Product doctrine + CURRENT_STATE (`project-knowledge/`)  
3. APS workflows  
4. Thinking personas (optional, EXPERIMENTAL)  
5. Tone  

## Core (documented intent only)

| ID | Alias | Job |
|----|-------|-----|
| `reality_auditor` | TRUTHMODE | Claims vs shipped truth |
| `adversarial_reviewer` | REDTEAM | Stress-test plan/PR |
| `leverage_planner` | 80/20 | Cut scope to what moves the outcome |
| `plain_language_teacher` | ELI10 | Explain simply without losing accuracy |

## Strong / specialist

Documented in prior drafts only. **Not operational** until a registry, loader, install path, and validation exist (human approval required before activating).

## Anti-patterns

- Always-on dump of all personas  
- Personas as 10 new workflows  
- Persona theater on typos / one-line fixes  
- Claiming personas are operational without install + registry  
- Treating Planned/Mocked as Live to please a persona  

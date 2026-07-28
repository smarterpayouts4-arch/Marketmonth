# Context Selection

## Pointer rule (mandatory)

APS `project-context/` files are pointers, not doctrine. Resolve every pointer and read the canonical `project-knowledge/` document before reasoning from it.

Never treat stub text as product truth. Stubs exist for portability and workflow `required_context` lists only.

## Default

Load **only** the union of `required_context` from selected workflows — as **pointers**:

1. Open `agent-prompt-system/project-context/<file>.md`
2. Follow the pointer to the canonical path under `project-knowledge/`
3. Reason from the canonical document (or `mm_read_project_doc` for allowlisted ids)

## Optional extras

You may load an additional project-context pointer when:

1. A protected-area or risk note is likely relevant, **and**
2. You state a one-line reason.

Then still resolve that pointer into `project-knowledge/` before using it.

Do **not** load the entire `agent-prompt-system/` tree or all of `project-context/` by default.

## Portable vs project-specific

| Layer | May contain product facts? |
|-------|----------------------------|
| `core/`, `workflows/`, `adapters/`, `scripts/` | **No** — keep generic |
| `project-context/` | **Pointers only** — not doctrine |
| `project-knowledge/` | **Yes** — canonical MarketMonth truth |

## Stale context

If pointers look wrong, refresh `project-context/` via onboarding / initialize script. Do not invent doctrine.

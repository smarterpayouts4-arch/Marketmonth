# MarketMonth brain (`src/brain`)

Connected content system — **stages and functions**, not multi-agent brains.

```text
Directions Brain (master + up to six ideas)
  → Human selects ONE
  → Content Atom Builder (auto validate ready|invalid)
  → Channel specialists (YouTube Short enabled; others not_connected)
  → Human approve/reject/regenerate per package
```

| Folder | Role |
|--------|------|
| `use-cases/` | Brain entry points (directions + production orchestration) |
| `content/` | STRATEGIZE directions (master → six → pick one) |
| `core/` | Brand Core schema, compile, shared identity |
| `atom/` | Channel-neutral Content Atom (strategic SSoT) |
| `strategy-lock/` | Semantic StrategyLock (hashes + claim/proof IDs) |
| `pipeline/` | Core Content Brain entry (`runCoreContentBrain`) |
| `channels/` | `channelRegistry` + specialists / scaffolds |
| `channels/youtube-short/` | Enabled YouTube Short specialist |
| `store/` | Topic history CSV repository + handoff/atom/package JSON |
| `render/` | Image/voice provider interfaces + JSON2Video compiler |
| `qa/` | Deterministic quality checks |

**Ownership:** Everything that thinks lives in `src/brain/`. UI/routes/scripts call use cases; they must not implement generation logic or parse the history CSV directly.

Doctrine: see [`project-knowledge/CONTENT_BRAIN.md`](../../project-knowledge/CONTENT_BRAIN.md).

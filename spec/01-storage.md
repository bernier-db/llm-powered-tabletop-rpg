---
title: Storage Layout
status: AGREED
summary: How runtime state, authored content, and semantic recall split across markdown, SQLite, sqlite-vec, and a relationships table.
related: [00-overview.md, 02-tools-orchestration.md, 04-npc-memory.md, 07-geography.md]
updated: 2026-05-17
---

# Storage Layout

Different entity types have genuinely different access patterns. Forcing one storage tech costs more than running the right one for each role.

## The layout

| Tech                      | Role                                                        |
|---------------------------|-------------------------------------------------------------|
| Markdown in git           | Authored source: campaigns, world bible, NPC templates      |
| SQLite                    | Runtime state (mutated constantly; transactional)           |
| sqlite-vec                | Semantic recall over scene transcripts, NPC memories, codex |
| Relationships table (SQL) | "Graph" via adjacency-list; avoids Neo4j overhead           |

## Rule of thumb

- **SQL** for "what is true right now."
- **Vector** for "what do I half-remember."
- **Markdown** for "what does the human author write and check into git."

## Why not the obvious alternatives

- **Graph DB (Neo4j etc.)** — overkill. Most queries are 1–2 hops; a relationships table with joins handles it. Adds operational overhead.
- **Vector-only** — loses constraint enforcement (HP can't go negative beyond death); exact lookups via embeddings are unreliable.
- **Markdown-only** — no transactions, no efficient queries, file parsing on every turn is slow.

## Authored vs runtime separation

Markdown is the **seed**, SQLite is the **state**. Updating an NPC's HP during play does *not* rewrite their markdown file. On campaign load, the engine parses markdown → seeds runtime DB. This separation means campaigns become portable, shareable, forkable (a campaign is a git repo).

## Saves

A save = a copy of the runtime SQLite file. Branching saves ("what if I'd taken the other path?") = extra copies. Cheap and exact.

## Related

- Concrete schemas live in [`02-tools-orchestration.md`](02-tools-orchestration.md) (tool surface) and topic-specific files ([`07-geography.md`](07-geography.md) has Location/Edge schemas; [`04-npc-memory.md`](04-npc-memory.md) has memory schemas).
- A consolidated state-store schema is **TODO** — see [`TODO-BRAINSTORM.md`](TODO-BRAINSTORM.md).

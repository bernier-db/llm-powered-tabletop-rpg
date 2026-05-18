---
title: Overview
status: DRAFT
summary: Project goals, four-layer architecture, Actor abstraction, and the agent layout. One-page orientation for the whole design.
related: [01-storage.md, 02-tools-orchestration.md, 03-rules-combat.md, 05-director.md]
updated: 2026-05-17
---

# Overview

LLM-powered RPG engine: campaigns, scenarios, persistent state, faithful DM craft, AI party members, world generation, multimodal output.

- Ruleset target: **Pathfinder-lightweight** — see [`03-rules-combat.md`](03-rules-combat.md)
- Interface target: **modular** — solo / solo+AI party / multiplayer table — same engine, different actor mixes
- Stack leaning: **TypeScript** (see root `CLAUDE.md`)

## Four layers under the narrator

1. **State store** — source of truth for everything the LLM cannot be trusted to remember. See [`01-storage.md`](01-storage.md).
2. **Memory tiers** — hot (current scene), warm (session summary), cold (codex w/ vector recall).
3. **Rules engine** — deterministic dice & resolution. The LLM never rolls its own dice. See [`03-rules-combat.md`](03-rules-combat.md).
4. **Director** — backstage planner; runs between scenes to advance faction clocks, inject foreshadowing, manage spotlight, set scene pressure. See [`05-director.md`](05-director.md).

## Actor abstraction

Everything that takes a turn is an Actor with the same shape:

```ts
Actor = {
  id, name, sheet,
  controller: 'human' | 'agent' | 'dm',
  agent_profile?: { goals, personality, voice, secrets, knowledge },
  current_intent?: PendingAction,
}
```

This is what unifies player / AI companion / NPC / monster and makes multiplayer just "more actors with `controller: 'human'`."

## Agent layout

| Agent | Role | Floor-holding |
|---|---|---|
| **DM (Narrator)** | Scene framing, narration, adjudication | Default in free play |
| **NPC actor(s)** | Per-NPC voices, scoped knowledge | When DM defers dialogue |
| **Combat** | Initiative + turn resolution | While combat is active |
| **Companion** | Party-facing NPC w/ autonomy gates | When triggered by drives/lines |
| **Director** | Between-scene planner | Never speaks to player |
| **Generator** | On-demand world/NPC/encounter creation | Invoked on demand |

See [`02-tools-orchestration.md`](02-tools-orchestration.md) for the router, handoff protocol, and tool permissions per agent.

---
title: Architecture Diagrams — Index
status: DRAFT
summary: Mermaid diagrams (conceptual + tool-call layers) for the engine's agentic structures across scenarios — core loops, party shapes, backstage systems, generation, travel.
related: [../README.md, ../00-overview.md, ../02-tools-orchestration.md]
updated: 2026-05-17
---

# Architecture Diagrams

Mermaid diagrams for the engine's agentic structures, organized by scenario.
Each file pairs a **conceptual** view (agents, stores, handoffs at a glance) with a **tool-call sequence** view (which agent calls which tool, in what order).

These diagrams reflect the design captured in the sibling topic files
(`00-overview.md` … `09-multimodality.md`). When a diagram and the prose
disagree, the prose wins — open an issue / update the diagram.

## Index

### Core loops — `core-loops/`
The default moment-to-moment play.

- [`01-solo-free-play.md`](core-loops/01-solo-free-play.md) — DM holds floor, occasional NPC defer. Source: [`02-tools-orchestration.md`](../02-tools-orchestration.md).
- [`02-combat-encounter.md`](core-loops/02-combat-encounter.md) — DM ↔ Combat handoff; 3-action turn loop with rules engine. Source: [`03-rules-combat.md`](../03-rules-combat.md).
- [`03-npc-reencounter-memory.md`](core-loops/03-npc-reencounter-memory.md) — How an NPC pulls memories + disposition before speaking. Source: [`04-npc-memory.md`](../04-npc-memory.md).

### Party shapes — `party-shapes/`
How the actor mix and routing change depending on who's at the table.

- [`01-solo-ai-companion.md`](party-shapes/01-solo-ai-companion.md) — Companion agent with autonomy gates (drives/lines).
- [`02-multiplayer-table.md`](party-shapes/02-multiplayer-table.md) — Multiple human controllers sharing one engine.

### Backstage systems — `backstage/`
Things that run while the player is not looking at them.

- [`01-director-between-scenes.md`](backstage/01-director-between-scenes.md) — Foreshadow queue, faction clocks, spotlight tracker → scene brief. Source: [`05-director.md`](../05-director.md).
- [`02-memory-tiers-summarizer.md`](backstage/02-memory-tiers-summarizer.md) — Hot → warm → cold memory transitions and cold recall.

### Generation — `generation/`
Content creation pipelines.

- [`01-campaign-authoring-validation.md`](generation/01-campaign-authoring-validation.md) — Authored markdown → parser → validator → DB seed.
- [`02-entity-generation-pipeline.md`](generation/02-entity-generation-pipeline.md) — Two-layer pattern: procedural skeleton → canon retrieval → LLM expansion → commit.
- [`03-scenario-encounter-generation.md`](generation/03-scenario-encounter-generation.md) — JIT encounter generation tied to current context.

### Travel — `travel/`
- [`01-party-movement-flow.md`](travel/01-party-movement-flow.md) — `move_party()` stages, including Director hook on big time advances.

## Reading order

If you've never read the design before, do `00-overview.md` → `02-tools-orchestration.md` first, then come here.
For an architecture-only orientation, read in this order:
1. `core-loops/01-solo-free-play.md` — the spine
2. `core-loops/02-combat-encounter.md` — the floor-holding handoff in action
3. `backstage/01-director-between-scenes.md` — what runs between scenes
4. `generation/02-entity-generation-pipeline.md` — the universal generation discipline
5. Whatever else is relevant to the work you're doing

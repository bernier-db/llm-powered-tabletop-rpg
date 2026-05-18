---
title: Tools & Orchestration
status: DRAFT
summary: The tool surface agents call instead of touching storage, the router/handoff protocol, the turn-loop state machine, and per-agent permission scopes.
related: [00-overview.md, 01-storage.md, 03-rules-combat.md, 05-director.md, 08-cross-cutting.md]
updated: 2026-05-17
---

# Tools & Orchestration

> Concrete prompts and message formats between agents are still OPEN — see [`TODO-BRAINSTORM.md`](TODO-BRAINSTORM.md).

Agents never touch storage directly. Everything goes through a tool surface. This is what makes the system testable, swappable, and stops the LLM from inventing state.

## Tool surface (logical groups)

### State reads
`get_actor`, `get_actors_in_scene`, `get_scene`, `get_location`, `get_locations_near`,
`get_inventory`, `get_equipped`, `get_npc_memories`, `get_relationships`,
`get_active_quests`, `get_faction_clocks`, `get_recent_scenes`,
`query_codex(vector)`, `query_memories(vector)`

### State writes (gated per agent)
`update_hp`, `set_condition`, `clear_condition`, `transfer_item`, `consume_item`,
`move_actor`, `commit_npc_memory`, `set_disposition`, `advance_time`,
`mark_quest_beat`, `advance_faction_clock`, `add_codex_entry`,
`start_combat`, `end_combat`

### Rules engine (deterministic; LLM cannot call `roll()` directly)
`roll`, `check`, `attack`, `cast_spell`, `apply_damage`, `apply_healing`,
`award_xp`, `level_up`

### Director / scene control
`next_scene`, `get_scene_brief`, `queue_foreshadow`, `peek_foreshadow_queue`,
`nudge_spotlight`

### Generation
`generate_location`, `generate_npc`, `generate_encounter`, `generate_item`

### Geography (see [`07-geography.md`](07-geography.md))
`get_neighbors`, `get_path`, `get_location_context`, `describe_surroundings`,
`move_party`

## Key invariants enforced by the tool layer (not the prompt)

- **DM/Narrator can only request resolution via `check`/`attack`, never call `roll()`** — structural fix to the "LLM fudges its own dice" failure mode.
- **NPC agents get redacted views from `get_actor`** — cannot see PC secrets/inventory. Scoping enforced in the tool layer, not in prompts.
- **Only one agent holds the floor at a time**; handoffs go through the Router.
- **All writes are transactional** and audited in a `roll_log` / `state_log` table.

## Agent permissioning matrix

| Agent | Reads | Writes | Notes |
|---|---|---|---|
| **DM (Narrator)** | all state, codex, scene history | move_actor, transfer_item, set_condition, advance_time, commit_npc_memory, add_codex_entry | Cannot call `roll()` directly. Cannot resolve combat. |
| **Combat** | combatants, scene, conditions | hp, conditions, position, end_combat | Owns initiative tracker during combat. |
| **NPC actor** | *scoped to what this NPC plausibly knows* | dialogue only; proposes actions to DM | Tool-layer redaction. |
| **Companion** | party-public + own sheet | own actions, dialogue | Autonomy gates from drives/lines. |
| **Director** | everything | foreshadow queue, faction clocks, scene briefs | Between scenes only. Never speaks to player. |
| **Generator** | world bible, region context | generation tools | Commits new entities to canon. |

## Turn-loop state machine

```
       ┌──────────────────────────────────────────┐
       │                                           │
       v                                           │
   AWAITING_INPUT ──input──> RESOLVING ──> NARRATING ──> COMMITTING
                                │                              │
                                │ combat trigger               │ scene break
                                v                              v
                            COMBAT_LOOP                   SCENE_TRANSITION
                                                                │
                                                                v
                                                           DIRECTOR_BRIEF
                                                                │
                                                                v
                                                           (back to top)
```

## One beat (pseudocode)

```
loop:
  actor = active_actor()
  intent = actor.controller.get_intent(scene_context)
  if intent.needs_check:
    result = rules.check(actor.id, intent.skill, intent.dc, intent.mods)
    intent.result = result
  if intent.is_attack:
    intent.result = rules.attack(actor.id, intent.target, intent.weapon)
  narration = dm_agent.narrate(intent, with_result=intent.result)
  for change in narration.proposed_state_changes:
    state.apply(change)            # gated through tool surface
  scene.append(narration)
  if scene.should_break():
    director.run_hooks()
    scene = state.open_next_scene(director.brief())
```

## Handoffs

Only the **Router** decides who speaks next. Common patterns:
- DM → NPC: when an NPC has substantial dialogue, DM signals `defer_to(npc_id)`; router invokes that NPC's agent. NPC returns dialogue + intent; DM resumes scene framing.
- DM → Combat: when initiative is rolled, DM hands off; Combat owns the floor until `end_combat`.
- Anything → Director: between scenes, never mid-scene.

Mid-scene, only one agent ever holds the floor. This prevents the schizophrenic "DM speaks, NPC speaks, DM speaks again in the same beat" effect.

## Context budgeting per agent

Layered by importance:
1. **System** — role + tone + rules system summary
2. **Session state** — tone calibration, content lines, active mode (free/combat)
3. **Director brief** — only at scene start
4. **Hot scene** — last ~20 turns verbatim
5. **Warm summary** — current session compressed
6. **Relevant cold recall** — retrieved entries from codex/memory based on situation
7. **Actor sheets** — only those present in scene
8. **Tools available**

A summarizer compresses hot → warm every K turns to keep the budget bounded. Details in [`08-cross-cutting.md`](08-cross-cutting.md).

## Open

Concrete agent prompts, message formats between agents, voice-distinction techniques — **TODO**. See [`TODO-BRAINSTORM.md`](TODO-BRAINSTORM.md).

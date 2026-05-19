---
title: Future Ideas — Post-v1 Parking Lot
status: DEFERRED
summary: Capture-now, build-later. Sensory output, gameplay subsystems, authoring/ecosystem, cross-campaign persistence, multiplayer extras, quality/ops tooling.
related: [TODO-BRAINSTORM.md, 09-multimodality.md]
updated: 2026-05-17
---

# Future Ideas — Post-v1 Parking Lot

Capture-now, build-later. Not on the critical path; not in any design topic file yet.

If an idea here turns out to have architectural implications, **promote it** to its own topic file in `spec/` and update [`TODO-BRAINSTORM.md`](TODO-BRAINSTORM.md).

(TTS / STT / image-gen were promoted out of this list — see [`09-multimodality.md`](09-multimodality.md).)

## Sensory / output (beyond core multimodality)

- Mood music selection per scene (lo-fi shop / tense dungeon / heroic battle)
- Generate a podcast-style recap audio at session end
- Procedural battle-map rendering once we have a UI

## Gameplay systems

- Crafting & downtime activities (research, training, carousing, item crafting)
- Skill challenges (multi-roll structured non-combat tension)
- Letter-writing mechanic — NPCs send letters/messages between sessions
- Mailbox/journal: session-start digest of off-screen news, NPC progress, world events
- Off-screen NPC scheduling: NPCs have lives that progress while party is away
- Replayable encounters with randomized variants
- Plot armor / heroic-tier toggle
- Dynamic difficulty (frustration-aware? momentum-aware?)
- Dream sequences / vision mechanics
- Houserules overlay layer the engine respects
- "Cliffhanger detector" — engine flags good session-end break points
- Spellcraft / item identification as a subsystem with checks + research time

## Authoring & ecosystem

- Campaign sharing format (single tarball: markdown + assets + manifest)
- Campaign marketplace / index
- Co-DM mode: human DM uses the engine as live assistant (not replacement)
- Fork-a-campaign — version-controlled remixes
- Procedural session-recap generator for resuming after a long gap
- "What if" branch viewer — explore alternate timelines from any save point
- Achievements / GM commendations for memorable moments

## Cross-campaign / persistence

- Multi-campaign shared world: NPCs from one campaign cameo in another
- Reputation that travels with a PC across campaigns
- Worldbuilding mode: pure sandbox with no campaign skeleton

## Multiplayer specific

- Per-player private channels (whispers, individual rolls hidden from table)
- "GM tip" channel for the engine to coach a hesitant player
- Turn-ordering policies (round-robin vs. spotlight-priority vs. free-form)

## Quality / ops

- Eval harness: scripted scenarios that test DM behavior (already promoted to a TODO thread in [`08-cross-cutting.md`](08-cross-cutting.md))
- Replay debugger: step through a session, inspect state at every turn
- A/B testing different DM prompts on the same scripted scenario
- Cost dashboard: tokens per turn, per session, per NPC agent

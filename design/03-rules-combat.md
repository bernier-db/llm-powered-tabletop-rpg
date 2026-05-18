---
title: Rules System & Combat
status: AGREED
summary: Pathfinder-lightweight choices (PF2e 3-action economy, four-degree outcomes) plus the combat loop with zones and tactics.
related: [00-overview.md, 02-tools-orchestration.md, 11-dm-styles-tones.md]
updated: 2026-05-17
---

# Rules System & Combat

> Combat loop is DRAFT; ruleset choice is AGREED.

## Pathfinder-lightweight choices

### Keep
- d20 + modifier vs DC/AC (universal resolution)
- Six ability scores → modifiers
- Classes as **archetype packages** (Fighter, Rogue, Cleric, Wizard, Ranger, Bard, …) — each is: hit die, key abilities, 3–5 signature features per tier, a small spell/maneuver list
- HP, AC, saves (Fort/Ref/Will)
- **PF2e's 3-action economy** — the single best mechanic to steal. Easy for an LLM to track, gives meaningful tactical choice without bonus/move bookkeeping.
- Conditions (frightened, prone, off-guard, etc.) with explicit durations stored on the actor
- **Four-degree outcome ladder** (crit fail / fail / success / crit success on ±10 from DC). Excellent for LLM-driven narration — gives narrative hooks the model can latch onto.

### Cut for v1
- Feats beyond class features (maybe one "background feat" slot per tier)
- Encumbrance math beyond "obvious stuff: yes/no"
- Most magic-item bonuses (give items narrative effects + occasional flat bonuses)
- Full spell list — pick ~30 spells per tradition, that's the game
- Skill subsystems (just one roll per skill, no nested rules)

The point isn't faithfulness — it's giving the LLM enough crunch that consequences feel mechanical, without so much that every turn is a bookkeeping puzzle.

## Combat loop

### Initiative
One Perception (or Stealth) roll per combatant. Order is fixed for the encounter — no per-round re-rolls.

### Per-turn flow
1. Combat agent announces "You have 3 actions" (or the actor's current budget after conditions).
2. Player declares actions in plain language. Common actions are auto-recognized: Strike, Stride, Step, Demoralize, Raise Shield, Cast, etc. Novel ones get adjudicated as a check at an appropriate DC.
3. Rules engine resolves each action with explicit dice + DC, returns outcome at one of four degrees.
4. Combat agent narrates the outcome in ~2 sentences, applies state changes (HP, conditions, position zone).
5. Next actor.

### Position
**Zones**, not a grid: close / near / far / out-of-reach from any given anchor. LLMs track zones easily; grids require a UI most prototypes don't have yet.

### Enemy tactics
Each monster has a tiny `tactics` field — `"focuses spellcasters, retreats below 25% HP"` — that the Combat agent reads to make choices. Not full AI, just enough to feel less random.

### Hand-off
Combat agent owns the floor from initiative until `end_combat`. DM resumes scene framing afterward.

## Progression & level-up

XP milestones (or session-based leveling — TBD). Level-up flow walks the player through HP/feature/spell choices, all validated and committed to the state store.

See `level_up` tool in [`02-tools-orchestration.md`](02-tools-orchestration.md).

## Open

- Exact spell list per tradition (~30 each) — to be authored
- XP vs milestone decision
- Crit specialization effects (PF2e has them per weapon group — keep simple or include?)

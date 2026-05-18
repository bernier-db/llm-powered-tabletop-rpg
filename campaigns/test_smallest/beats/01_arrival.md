---
title: "Beat 01 — Arrival at Stonebridge"
status: DRAFT
summary: Cold open; party arrives at the Drunken Goose, encounters Marta, and learns of Vellis's disappearance through ambient conversation; first branch point on investigation vs. departure.
related:
  - ../campaign.md
  - ../locations/location_drunken_goose.md
  - ../npcs/barkeep_marta.md
  - ../foreshadow/cult_symbol.md
updated: 2026-05-17

# Beat entity fields
id: 01_arrival
dependencies: []    # cold open; no prior beats required
location_id: location_drunken_goose
npcs_present:
  - barkeep_marta
foreshadow_seeds_active:
  - foreshadow_cult_symbol
---

# Beat 01 — Arrival at Stonebridge

## Scene Frame

*Time: late afternoon. The Drunken Goose is warming up for the evening rush — four regulars
already at the bar, a fire going, Marta moving behind the plank without hurry.*

The party has arrived in Stonebridge by whatever road brought them here. They are not
locally known. Marta will serve them without comment and observe.

## DM Notes — What the Room Contains

- **Ambient hook**: two regulars are talking about the missing merchant in lowered voices.
  If the party listens (Perception DC 8): "...three days now, and Pip's just standing there
  like a dog that's lost its farmer." This surfaces the Vellis hook passively.

- **Marta's state**: she is tired and watchful. She will not volunteer information.
  She answers direct questions with minimum words. She does not lie — she omits.
  - First threshold (low trust): will confirm Vellis is missing; "Market warden's posted a notice."
  - Second threshold (moderate trust — buy a round for the house, or show genuine concern):
    will say she saw something but deflect — "Not my business to say."
  - Third threshold (high trust — private conversation, demonstrated good intent):
    will describe what she saw: the robed figure, Vellis walking stiffly, the red brand.
    She will ask the party not to involve her name.

- **Carter's story** (optional entry to foreshadow seed): if the party asks about road news
  or strange events, one of the regulars will mention the burned tree mark.
  See [`../foreshadow/cult_symbol.md`](../foreshadow/cult_symbol.md).

## Branch Hints

```yaml
branches:
  - id: branch_investigate_vellis
    trigger: "Party asks about Vellis, the notice, or the missing merchant"
    leads_to: null    # TBD: beat 02 (investigation) not yet authored; open terminus
    hint: "Redirect to market district; Pip the apprentice is the next information node."

  - id: branch_follow_road_sign
    trigger: "Party asks about the burned tree mark or heads south"
    leads_to: null    # TBD: beat 03 (road encounter) not yet authored; open terminus
    hint: "Route through location_south_road; roll on encounter_forest_road table."

  - id: branch_ignore_and_leave
    trigger: "Party declines all hooks and attempts to move on"
    leads_to: null    # TBD: open world; Director advances cult clock one step
    hint: "Director should tick the clock and have the party hear the news later."
```

## Win Condition for This Beat

Party has at least one active investigation thread: either the Vellis disappearance
or the road-mark identified as the Red Sigil.

## Failure Condition

Party leaves Stonebridge without picking up any thread. Director advances cult clock
to segment 2 and the party will encounter the consequences later.

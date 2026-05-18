---
title: "Cult of the Red Sigil"
status: DRAFT
summary: A nascent apocalyptic mystery cult; four-segment clock; goal is to re-establish a suppressed ritual site in the Greyhill hills; present members include Vellis (coerced) and Antagonist A.
related:
  - ../campaign.md
  - ../npcs/vellis.md
  - ../npcs/antagonist_a.md
  - ../foreshadow/cult_symbol.md
updated: 2026-05-17

# Faction entity fields
id: cult_of_red_sigil
name: "The Cult of the Red Sigil"
goal: "Re-consecrate the old hill-shrine suppressed by the church forty years ago and perform a binding ritual before the winter solstice."
members:
  - vellis          # coerced member; access asset; npcs/vellis.md
  - antagonist_a    # cell leader; npcs/antagonist_a.md
---

# Cult of the Red Sigil

## Overview

The cult is not large — perhaps a dozen true believers scattered across the region — but it
is organized. The cell leader (Antagonist A) has been quietly working Greyhill for eight months,
building toward a single ritual event at an old hill-shrine.

The cult's theology is deliberately vague in the authored material: the DM generation pipeline
should expand it only if the party investigates deeply enough to need it. For v0.1 test purposes
it is a generic "forbidden ritual / suppressed site" framework.

## Faction Clock

Clock name: **"The Rite Advances"**
Segments: 4

```yaml
clock:
  name: "The Rite Advances"
  segments: 4
  current_segment: 1    # one segment advanced (Vellis recruited and market access secured)
  segment_labels:
    - "1: Foothold — recruit an access asset inside the settlement"
    - "2: Passage — establish a covert supply route through the market"
    - "3: Gathering — bring the inner circle to the hill-shrine"
    - "4: Consecration — perform the binding rite at solstice"
  segment_advancement: "Director advances the clock when the party fails to intervene at a key scene, or when sufficient in-world time passes."
```

Current state: segment 1 complete (Vellis recruited). Segment 2 is in progress — the covert
supply route is nearly established. If the party does not act within the session, segment 2
completes and the clock advances before they have a chance to disrupt it.

## Antagonist NPC References

- **Antagonist A** (`antagonist_a`) — cell leader, physically present in the region.
  Stub NPC; expanded JIT on reveal. See [`../npcs/antagonist_a.md`](../npcs/antagonist_a.md).
- **Vellis** (`vellis`) — coerced asset, not a true believer.
  See [`../npcs/vellis.md`](../npcs/vellis.md).

## Foreshadowing

The red hand-print burned into the roadside oak is this faction's calling mark.
See [`../foreshadow/cult_symbol.md`](../foreshadow/cult_symbol.md).

## Disposition Toward Party

Unknown (no contact yet). If the party begins investigating Vellis's disappearance,
Antagonist A will become aware and start monitoring them before making any direct move.

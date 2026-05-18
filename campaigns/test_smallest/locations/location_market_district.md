---
title: "Stonebridge Market District"
status: DRAFT
summary: The open-air stall market on the east side of Stonebridge's square; Vellis's counting house is here; the investigation's information hub.
related:
  - settlement_stonebridge.md
  - location_drunken_goose.md
  - location_south_road.md
  - ../npcs/vellis.md
updated: 2026-05-17

# Location entity fields
id: location_market_district
type: district
parent_id: settlement_stonebridge
biome: null
coords: null
---

# Stonebridge Market District

## Description

Twelve permanent stalls arranged in two facing rows east of the square, plus space for a dozen
more transient carts on market day (every Tenthday). Off-market days the district is quieter —
a few stalls open, apprentices restocking, the odd argument over a disputed order.

Vellis's counting house is at the north end of the market row: a narrow timber building with
a blue-painted door and a brass lock. The door has been locked for three days. His stall next to
it has been unmanned; his apprentice, a nervous boy named Pip, has been hovering nearby
without knowing what to do.

## Key NPC Present (currently absent)

- **Vellis** (merchant, normally present) — see [`../npcs/vellis.md`](../npcs/vellis.md)
  *Status: missing since three days ago. Counting house locked.*

## Scene Notes

- Pip the apprentice (minor NPC, no file — not named by the party yet) can be questioned.
  He knows: Vellis was nervous the past week; a cloaked figure visited the counting house
  twice at dusk; Vellis burned something in the back room the night before he vanished.
- The market warden (minor NPC) has posted a small notice about Vellis's absence and is
  offering 5 silver for information.

## Adjacency Edges

### Edge: Market District → Drunken Goose
```yaml
edge_id: edge_market_to_goose
from_id: location_market_district
to_id: location_drunken_goose
bidirectional: true
direction: NW
distance: 80m
travel_time:
  foot: 2       # minutes
terrain: urban
danger_level: 0
requires: null
encounter_table_id: null
```

### Edge: Market District → South Road
```yaml
edge_id: edge_market_to_south_road
from_id: location_market_district
to_id: location_south_road
bidirectional: true
direction: S
distance: 300m
travel_time:
  foot: 5       # minutes
terrain: urban
danger_level: 0
requires: null
encounter_table_id: null
```

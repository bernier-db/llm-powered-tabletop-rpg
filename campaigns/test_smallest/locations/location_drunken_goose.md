---
title: "The Drunken Goose"
status: DRAFT
summary: A tavern and inn on the north side of Stonebridge's market square; warm, cramped, run by Marta; the scenario's cold-open location.
related:
  - ../campaign.md
  - settlement_stonebridge.md
  - location_market_district.md
  - ../npcs/barkeep_marta.md
  - ../beats/01_arrival.md
updated: 2026-05-17

# Location entity fields
id: location_drunken_goose
type: building
parent_id: settlement_stonebridge
biome: null
coords: null
---

# The Drunken Goose

## Description

A low-ceilinged timber tavern with a hand-carved sign of a goose on its back, wings spread,
painted in faded yellow and brown. The common room holds eight tables; a stone hearth takes up
most of the north wall. The bar is a single plank of oak worn smooth by twenty years of elbows.
Upstairs: four rooms for let, two with actual beds.

Smells of woodsmoke, old ale, and the lavender Marta hangs in the rafters to cover the rest.

## Atmosphere

Regulars have assigned seats they've never stated aloud but will defend. Newcomers are watched
from the corners of eyes. The fire is always lit, even in summer — Marta says it keeps the
damp out; the regulars say it keeps strangers from getting too comfortable in the dark.

## Key NPC Present

- **Marta** (barkeep and owner) — see [`../npcs/barkeep_marta.md`](../npcs/barkeep_marta.md)

## Adjacency Edges

### Edge: Drunken Goose → Market District
```yaml
edge_id: edge_goose_to_market
from_id: location_drunken_goose
to_id: location_market_district
bidirectional: true
direction: SE
distance: 80m
travel_time:
  foot: 2       # minutes
terrain: urban
danger_level: 0
requires: null
encounter_table_id: null
```

### Edge: Drunken Goose → South Road (via Market District)
*Indirect — party must pass through market district; see south_road edges.*

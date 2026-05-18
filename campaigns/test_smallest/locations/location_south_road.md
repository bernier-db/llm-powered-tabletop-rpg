---
title: "South Road — Stonebridge Outskirts"
status: DRAFT
summary: The road segment leaving Stonebridge south into the forested hills; wired to the forest_road encounter table; the only wilderness leg in this scenario.
related:
  - settlement_stonebridge.md
  - location_market_district.md
  - region_greyhill.md
  - ../encounters/forest_road.md
updated: 2026-05-17

# Location entity fields
id: location_south_road
type: wilderness_zone
parent_id: region_greyhill
biome: temperate_hills
coords: null
---

# South Road — Stonebridge Outskirts

## Description

The packed-earth road south of Stonebridge follows the Ardith River's east bank for half a mile
before the forest closes in on both sides. Wheel ruts are deep from timber wagons. The trees
are old enough that their canopy meets overhead in places, turning midday into a green dusk.

This is where the carter saw the burned red hand-print on a roadside oak three days ago.
The mark is still there, at eye height, on a tree about two hundred meters past the tree line.

## Scene Notes

- The burned mark is a cult of the red sigil calling symbol — anyone succeeding on a
  Religion or History check (DC 12) recognizes it as the condemned sigil from forty years ago.
- Following the road further south eventually leads out of the scenario scope (deferred).

## Adjacency Edges

### Edge: South Road → Market District (back into town)
```yaml
edge_id: edge_south_road_to_market
from_id: location_south_road
to_id: location_market_district
bidirectional: true
direction: N
distance: 300m
travel_time:
  foot: 5       # minutes
terrain: road
danger_level: 0
requires: null
encounter_table_id: null
```

### Edge: South Road → Forest Depths (wilderness leg)
```yaml
edge_id: edge_south_road_into_forest
from_id: location_south_road
to_id: null           # TBD: pending design — destination is off-scope; loader should treat null toId as an open edge
bidirectional: false
direction: S
distance: 8000m       # ~8 km to next named location
travel_time:
  foot: 120           # minutes (2 hours on foot)
  horse: 50           # minutes
terrain: road
danger_level: 2
requires: null
encounter_table_id: encounter_forest_road
```

## Notes for Loader

- `to_id: null` on the south-forest edge is intentional — this edge is a "horizon edge"
  pointing out of the authored scope. The loader should accept null toId as a valid open terminus.
  # TBD: pending design — confirm loader behavior for open-terminus edges.

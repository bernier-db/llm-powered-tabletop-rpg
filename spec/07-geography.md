---
title: Geographic Movement & Spatial Model
status: AGREED
summary: Spatial graph in SQLite as primary; optional coordinates for rendering; GeoJSON only as derived export. Plus the move_party() flow and DM-side discipline.
related: [00-overview.md, 01-storage.md, 02-tools-orchestration.md, 05-director.md]
updated: 2026-05-17
---

# Geographic Movement & Spatial Model

## Primary representation: adjacency graph in SQLite

Locations are nodes; edges carry distance, travel time per transport mode, terrain, danger level, direction, gating requirements, and optional encounter table.

LLMs reason over graphs extremely well. This is the gameplay primary.

## Secondary: optional coordinates at the scale where rendering matters

World map and region map locations may get `(x, y, scale)` for visual rendering. Building interiors don't need any.

## GeoJSON: derived export only

Use only for:
- A real visual map UI (rivers/biomes as polygons)
- Geographic-feature reasoning (storm-front modeling)
- Importing maps from Inkarnate / Wonderdraft / QGIS

Not the gameplay primary because:
- LLMs don't reason over coordinate arrays well
- Gameplay logic is "what can the party do" — a graph query, not geometry
- Adds bookkeeping (projections, coord systems) without payoff

## Schema

```ts
Location = {
  id, name,
  type: 'region' | 'settlement' | 'district' | 'building' | 'room' | 'wilderness_zone',
  parentId,                        // hierarchical containment (zoom)
  biome, description,
  coords: { x, y, scale: 'world' | 'region' | 'settlement' } | null,
}

LocationEdge = {
  id, fromId, toId, bidirectional,
  direction: 'N'|'NE'|'E'|'SE'|'S'|'SW'|'W'|'NW' | null,
  distance,
  travelTime: { foot: number, horse: number, boat?: number },  // minutes/hours
  terrain: 'road' | 'trail' | 'wilderness' | 'mountain' | 'water' | 'underground' | 'urban',
  dangerLevel: 0 | 1 | 2 | 3 | 4,
  requires: ItemId | CheckSpec | QuestFlag | null,
  encounterTableId | null,
}

PartyMovementLog = {
  partyId, fromId, toId, startedAt, arrivedAt,
  eventsDuringTravel: TravelEvent[],
  pathTaken: LocationId[],
}
```

## `move_party()` flow

1. **Reachability check** — graph query; surface gating if edge `requires` blocks ("you need a boat / a key / to have completed the bridge quest").
2. **Pathfinding** — if multi-hop, compute path. Player chooses preference: shortest (distance), safest (danger), fastest (time given transport).
3. **Per segment** — `advance_time`; roll on `encounterTableId` if any; narrate the leg in 1–3 sentences.
4. **Director hook** — after big time advances, Director injects off-screen developments (faction clocks tick, NPCs may have moved). See [`05-director.md`](05-director.md).
5. **Arrival** — `party.current_location_id` updates; first-visit or return-visit framing fires.

## DM-side discipline

The DM never invents geography. Tool surface includes:
- `get_neighbors(id, withDirection=true)` — what's adjacent and where
- `get_path(from, to, prefer='shortest'|'safest'|'fastest')` — ordered edges + total cost
- `get_location_context(id)` — parent chain for zoom narration
- `describe_surroundings(id, range=1|2)` — pre-formatted summary to paraphrase

So "what's to the east?" → graph query → real answer. No hallucinated mountains.

## Zoom

Parent chain handles it. Party is simultaneously at every ancestor in their chain:
*Drunken Goose → Market District → Stonebridge → Greyhill region → Kingdom of Vellis*

Region-level events apply to anyone in that region; settlement-level to anyone in that settlement. Temporary locations (combat in an undescribed clearing) get generated as sub-locations and either kept or disposed after the scene.

## Open

- Mounted travel, vehicles, teleportation/fast-travel mechanics
- Weather as a region-scale state affecting travel time / danger
- Wilderness "exploration" mode (hex-crawl style) vs point-to-point travel — toggle per region?

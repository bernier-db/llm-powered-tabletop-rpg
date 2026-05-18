---
title: "Encounter Table — Forest Road (South of Stonebridge)"
status: DRAFT
summary: Weighted encounter table for the forest road south of Stonebridge; 5 entries ranging from mundane to dangerous; wired to the south_road location edge.
related:
  - ../locations/location_south_road.md
  - ../locations/region_greyhill.md
  - ../factions/cult_of_red_sigil.md
updated: 2026-05-17

# Encounter table entity fields
id: encounter_forest_road
wired_to_edge: edge_south_road_into_forest
region_id: region_greyhill
---

# Encounter Table — Forest Road

Roll 1d20 when the party traverses the south road wilderness leg (`edge_south_road_into_forest`).

## Table

| d20 Roll | Weight | Entry ID | Encounter | Danger |
|---|---|---|---|---|
| 1–7 | 35% | enc_fr_01 | Nothing — timber wagon ruts, birdsong, uneventful passage | 0 |
| 8–11 | 20% | enc_fr_02 | A carter heading north with an empty wagon; will mention the burned tree mark if not yet surfaced | 0 |
| 12–15 | 20% | enc_fr_03 | Pack of three wolves skirting the road; they will not attack unless the party lingers or makes noise; DC 12 Nature check to drive them off without incident | 1 |
| 16–18 | 15% | enc_fr_04 | Two cult members moving south under cover of merchant's cloaks; they will attempt to disengage and flee if recognized; give chase to capture information | 2 |
| 19–20 | 10% | enc_fr_05 | A Stonebridge resident (minor NPC) found tied to a tree — blindfolded, unharmed, left as a warning; carries a note written in cult cipher matching Vellis's coded ledger | 2 |

## Entry Notes

### enc_fr_01 — Clear Road
No encounter. Narrate the forest closing in, the wheel ruts, the quality of the light.
Surface the burned tree mark if the party has not seen it yet (Perception DC 10).

### enc_fr_02 — The Carter
The carter is Denn, a regular hauler on this road. He saw the burned mark three days ago and
told people about it in town. He is not in danger. He will talk freely.
Useful information he can share: he also noticed boot prints leading off the road toward the
north hill — in a group, roughly four to six people, within the last week.

### enc_fr_03 — Wolves
Three wolves. Standard stat blocks (Pathfinder-lightweight; see `rules/` — not yet authored).
Non-aggressive baseline. The encounter tests party skill use more than combat.
If combat occurs: wolves flee below 50% HP.

### enc_fr_04 — Cult Members
Two cult members (acolyte stat blocks; TBD: pending rules file).
They are carrying a sealed package — dried herbs used in the ritual preparation.
If captured and questioned (persuasion DC 14 or intimidation DC 12):
they know only that they were moving goods to a "waystation" — they do not know its exact location.
One of them has a red hand-print brand on their left palm.

### enc_fr_05 — The Warning
The tied resident is Pip's older sister, Nara — not yet a named NPC in this file.
# TBD: pending design — decide whether Nara warrants her own NPC file or stays a minor NPC.
She was grabbed the night before and left here to ensure Pip (and by extension the party, if
the cult has noticed their investigation) gets the message: stop asking questions.
The cipher note can be decoded with Vellis's coded ledger (automatic) or a DC 16 Linguistics check.

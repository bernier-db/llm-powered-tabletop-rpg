// src/schema/location.ts
// Cross-ref: design/07-geography.md §Schema, §move_party() flow
//            design/14-glossary.md §Location, §Location Edge, §Party Movement
import { z } from 'zod';
import {
  LocationId,
  LocationEdgeId,
  ActorId,
  ItemId,
  DirectionSchema,
  TerrainSchema,
  DangerLevelSchema,
  WorldTime,
  Timestamp,
} from './common';

// ---------------------------------------------------------------------------
// Location
// Cross-ref: design/07-geography.md §Schema; design/14-glossary.md §Location, §Settlement, §Region
// ---------------------------------------------------------------------------
export const LocationTypeSchema = z.union([
  z.literal('region'),
  z.literal('settlement'),
  z.literal('district'),
  z.literal('building'),
  z.literal('room'),
  z.literal('wilderness_zone'),
]);
export type LocationType = z.infer<typeof LocationTypeSchema>;

export const LocationCoordsSchema = z.object({
  x: z.number(),
  y: z.number(),
  scale: z.union([
    z.literal('world'),
    z.literal('region'),
    z.literal('settlement'),
  ]),
});
export type LocationCoords = z.infer<typeof LocationCoordsSchema>;

export const LocationSchema = z.object({
  id: LocationId,
  name: z.string(),
  type: LocationTypeSchema,

  // Hierarchical containment — parent is null at the world-root level
  // Cross-ref: design/07-geography.md §Zoom
  parent_id: LocationId.nullable(),

  biome: z.string().nullable(),         // e.g. 'temperate_hills', null for buildings
  description: z.string(),

  // Optional coordinates; most buildings/rooms omit these
  coords: LocationCoordsSchema.nullable(),

  // Reference to the encounter table for this location (authored in campaigns/)
  encounter_table_id: z.string().nullable(), // TBD: brand as EncounterTableId when that schema exists

  // Codex embedding reference
  codex_entry_id: z.string().nullable(),  // CodexEntryId — string to avoid cross-import
});
export type Location = z.infer<typeof LocationSchema>;

// ---------------------------------------------------------------------------
// CheckSpec — gating requirement for an edge that requires a skill check
// Cross-ref: design/07-geography.md §Schema (LocationEdge.requires)
// ---------------------------------------------------------------------------
export const CheckSpecSchema = z.object({
  skill: z.string(),
  dc: z.number().int(),
});
export type CheckSpec = z.infer<typeof CheckSpecSchema>;

// ---------------------------------------------------------------------------
// LocationEdge — directed edge in the spatial graph
// Cross-ref: design/07-geography.md §Schema; design/14-glossary.md §Location Edge
// ---------------------------------------------------------------------------
export const LocationEdgeRequiresSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('item'), item_id: ItemId }),
  z.object({ kind: z.literal('check'), check: CheckSpecSchema }),
  z.object({ kind: z.literal('quest_flag'), quest_flag: z.string() }),
]);
export type LocationEdgeRequires = z.infer<typeof LocationEdgeRequiresSchema>;

export const LocationEdgeSchema = z.object({
  id: LocationEdgeId,
  from_id: LocationId,
  to_id: LocationId,
  bidirectional: z.boolean(),

  direction: DirectionSchema.nullable(), // null for interior traversals (e.g. room-to-room)

  // Distance in abstract units (author-defined scale per region)
  distance: z.number(),

  // Per-mode travel time in minutes
  travel_time: z.object({
    foot: z.number(),
    horse: z.number(),
    boat: z.number().optional(),
  }),

  terrain: TerrainSchema,
  danger_level: DangerLevelSchema,

  // Optional gating requirement; null = always traversable
  requires: LocationEdgeRequiresSchema.nullable(),

  encounter_table_id: z.string().nullable(), // optional per-edge encounter table
});
export type LocationEdge = z.infer<typeof LocationEdgeSchema>;

// ---------------------------------------------------------------------------
// TravelEvent — a single event that occurred during a travel segment
// Cross-ref: design/07-geography.md §move_party() flow §Per segment
// ---------------------------------------------------------------------------
export const TravelEventSchema = z.object({
  segment_from_id: LocationId,
  segment_to_id: LocationId,
  event_type: z.union([
    z.literal('encounter'),
    z.literal('discovery'),
    z.literal('weather'),
    z.literal('npc_intersection'), // Director-injected NPC crossing the party's path
    z.literal('narrative'),        // Pure narration beat, no mechanical resolution
  ]),
  description: z.string(),
  world_time: WorldTime,
  // TBD: link to encounter/scene id when those are created
});
export type TravelEvent = z.infer<typeof TravelEventSchema>;

// ---------------------------------------------------------------------------
// PartyMovementLog
// Cross-ref: design/07-geography.md §Schema
// ---------------------------------------------------------------------------
export const PartyMovementLogSchema = z.object({
  id: z.string(),                       // TBD: brand as PartyMovementLogId
  party_id: z.string(),                 // TBD: brand as PartyId when that concept is formalized
  from_id: LocationId,
  to_id: LocationId,
  started_at: Timestamp,
  arrived_at: Timestamp.nullable(),     // null while travel is in progress
  path_taken: z.array(LocationId),      // ordered list of intermediate location ids
  events_during_travel: z.array(TravelEventSchema),
});
export type PartyMovementLog = z.infer<typeof PartyMovementLogSchema>;

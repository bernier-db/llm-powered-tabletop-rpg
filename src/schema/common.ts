// src/schema/common.ts
// Cross-ref: design/00-overview.md §Actor abstraction, §Four layers
//            design/03-rules-combat.md §Pathfinder-lightweight choices §Position
//            design/08-cross-cutting.md §Session zero
//            design/14-glossary.md §Controller, §OutcomeDegree, §Zone
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Branded ID primitives
// Cross-ref: design/13-risks-tripwires.md §11 (Zod validation of tool args)
// ---------------------------------------------------------------------------
export const ActorId = z.string().brand<'ActorId'>();
export type ActorId = z.infer<typeof ActorId>;

export const LocationId = z.string().brand<'LocationId'>();
export type LocationId = z.infer<typeof LocationId>;

export const LocationEdgeId = z.string().brand<'LocationEdgeId'>();
export type LocationEdgeId = z.infer<typeof LocationEdgeId>;

export const SceneId = z.string().brand<'SceneId'>();
export type SceneId = z.infer<typeof SceneId>;

export const NPCMemoryId = z.string().brand<'NPCMemoryId'>();
export type NPCMemoryId = z.infer<typeof NPCMemoryId>;

export const FactionId = z.string().brand<'FactionId'>();
export type FactionId = z.infer<typeof FactionId>;

export const QuestId = z.string().brand<'QuestId'>();
export type QuestId = z.infer<typeof QuestId>;

export const ItemId = z.string().brand<'ItemId'>();
export type ItemId = z.infer<typeof ItemId>;

export const RelationshipId = z.string().brand<'RelationshipId'>();
export type RelationshipId = z.infer<typeof RelationshipId>;

export const RollLogId = z.string().brand<'RollLogId'>();
export type RollLogId = z.infer<typeof RollLogId>;

export const ForeshadowSeedId = z.string().brand<'ForeshadowSeedId'>();
export type ForeshadowSeedId = z.infer<typeof ForeshadowSeedId>;

export const CodexEntryId = z.string().brand<'CodexEntryId'>();
export type CodexEntryId = z.infer<typeof CodexEntryId>;

export const BeatId = z.string().brand<'BeatId'>();
export type BeatId = z.infer<typeof BeatId>;

export const SessionId = z.string().brand<'SessionId'>();
export type SessionId = z.infer<typeof SessionId>;

export const CampaignId = z.string().brand<'CampaignId'>();
export type CampaignId = z.infer<typeof CampaignId>;

// ---------------------------------------------------------------------------
// Timestamp and world time
// Cross-ref: design/04-npc-memory.md §Schema (ts field)
// ---------------------------------------------------------------------------

/** Unix epoch milliseconds (JS Date.now()) for wall-clock timestamps. */
export const Timestamp = z.number().int().brand<'Timestamp'>();
export type Timestamp = z.infer<typeof Timestamp>;

/**
 * In-world time as a plain string (e.g. "Day 3, midday" or "Year 412, 14 Harvestmonth").
 * Format is campaign-defined; the engine treats it as opaque for display.
 * TBD: consider a structured { day, hour } object once a calendar system is designed.
 */
export const WorldTime = z.string().brand<'WorldTime'>();
export type WorldTime = z.infer<typeof WorldTime>;

// ---------------------------------------------------------------------------
// Controller union
// Cross-ref: design/00-overview.md §Actor abstraction; design/14-glossary.md §Controller
// ---------------------------------------------------------------------------
export const ControllerSchema = z.union([
  z.literal('human'),
  z.literal('agent'),
  z.literal('dm'),
]);
export type Controller = z.infer<typeof ControllerSchema>;

// ---------------------------------------------------------------------------
// Four-degree outcome ladder
// Cross-ref: design/03-rules-combat.md §Pathfinder-lightweight choices
//            design/14-glossary.md §Four-Degree Outcome Ladder
// ---------------------------------------------------------------------------
export const OutcomeDegreeSchema = z.union([
  z.literal('crit_fail'),
  z.literal('fail'),
  z.literal('success'),
  z.literal('crit_success'),
]);
export type OutcomeDegree = z.infer<typeof OutcomeDegreeSchema>;

// ---------------------------------------------------------------------------
// Lethality tier (session zero)
// Cross-ref: design/08-cross-cutting.md §Session zero; design/14-glossary.md §Lethality
// ---------------------------------------------------------------------------
export const LethalitySchema = z.union([
  z.literal('cinematic'),
  z.literal('standard'),
  z.literal('brutal'),
]);
export type Lethality = z.infer<typeof LethalitySchema>;

// ---------------------------------------------------------------------------
// Tone (session zero)
// Cross-ref: design/08-cross-cutting.md §Session zero; design/14-glossary.md §Tone
// ---------------------------------------------------------------------------
export const ToneSchema = z.union([
  z.literal('heroic'),
  z.literal('gritty'),
  z.literal('horror'),
  z.literal('comedy'),
  z.literal('political'),
  z.literal('pulp'),
  z.literal('mystery'),
  z.literal('cozy'),
  z.literal('weird'),
]);
export type Tone = z.infer<typeof ToneSchema>;

// ---------------------------------------------------------------------------
// Pacing (session zero)
// Cross-ref: design/08-cross-cutting.md §Session zero
// ---------------------------------------------------------------------------
export const PacingSchema = z.union([
  z.literal('fast-cut'),
  z.literal('slow-burn'),
]);
export type Pacing = z.infer<typeof PacingSchema>;

// ---------------------------------------------------------------------------
// Combat granularity (session zero)
// Cross-ref: design/08-cross-cutting.md §Session zero
// ---------------------------------------------------------------------------
export const CombatGranularitySchema = z.union([
  z.literal('narrative'),
  z.literal('tactical'),
]);
export type CombatGranularity = z.infer<typeof CombatGranularitySchema>;

// ---------------------------------------------------------------------------
// Combat zones (position abstraction — not a grid)
// Cross-ref: design/03-rules-combat.md §Position; design/14-glossary.md §Zone
// ---------------------------------------------------------------------------
export const CombatZoneSchema = z.union([
  z.literal('close'),
  z.literal('near'),
  z.literal('far'),
  z.literal('out-of-reach'),
]);
export type CombatZone = z.infer<typeof CombatZoneSchema>;

// ---------------------------------------------------------------------------
// Pacing call (Director output, injected into SceneBrief)
// Cross-ref: design/05-director.md §Outputs; design/14-glossary.md §Pacing Call
// ---------------------------------------------------------------------------
export const PacingCallSchema = z.union([
  z.literal('escalate'),
  z.literal('breather'),
  z.literal('hold'),
]);
export type PacingCall = z.infer<typeof PacingCallSchema>;

// ---------------------------------------------------------------------------
// Directions (LocationEdge)
// Cross-ref: design/07-geography.md §Schema
// ---------------------------------------------------------------------------
export const DirectionSchema = z.union([
  z.literal('N'),
  z.literal('NE'),
  z.literal('E'),
  z.literal('SE'),
  z.literal('S'),
  z.literal('SW'),
  z.literal('W'),
  z.literal('NW'),
]);
export type Direction = z.infer<typeof DirectionSchema>;

// ---------------------------------------------------------------------------
// Terrain type (LocationEdge)
// Cross-ref: design/07-geography.md §Schema
// ---------------------------------------------------------------------------
export const TerrainSchema = z.union([
  z.literal('road'),
  z.literal('trail'),
  z.literal('wilderness'),
  z.literal('mountain'),
  z.literal('water'),
  z.literal('underground'),
  z.literal('urban'),
]);
export type Terrain = z.infer<typeof TerrainSchema>;

// ---------------------------------------------------------------------------
// Danger level (LocationEdge)
// Cross-ref: design/07-geography.md §Schema
// ---------------------------------------------------------------------------
export const DangerLevelSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);
export type DangerLevel = z.infer<typeof DangerLevelSchema>;

// ---------------------------------------------------------------------------
// EntityRef (used inside GenerationRequest)
// Cross-ref: design/06-generation.md §Reusable generation contract
// ---------------------------------------------------------------------------
export const EntityRefSchema = z.object({
  id: z.string(),
  kind: z.string(), // e.g. 'location', 'npc', 'faction'
});
export type EntityRef = z.infer<typeof EntityRefSchema>;

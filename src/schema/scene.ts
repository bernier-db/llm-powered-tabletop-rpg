// src/schema/scene.ts
// Cross-ref: spec/05-director.md §Outputs
//            spec/architecture/backstage/01-director-between-scenes.md §classDiagram
//            spec/14-glossary.md §Scene, §Scene Brief, §Scene Break
import { z } from 'zod';
import {
  SceneId,
  ActorId,
  LocationId,
  ForeshadowSeedId,
  Timestamp,
  WorldTime,
  PacingCallSchema,
} from './common';

// ---------------------------------------------------------------------------
// ForeshadowSeedRef — planted seed reference inside a SceneBrief
// Cross-ref: spec/architecture/backstage/01-director-between-scenes.md §classDiagram
//            spec/14-glossary.md §Foreshadow Queue / Foreshadow Seed
// ---------------------------------------------------------------------------
export const ForeshadowSeedRefSchema = z.object({
  seed_id: ForeshadowSeedId,
  context_tags: z.array(z.string()),
  suggested_placement: z.string(), // e.g. "surface if party asks about road news"
});
export type ForeshadowSeedRef = z.infer<typeof ForeshadowSeedRefSchema>;

// ---------------------------------------------------------------------------
// NPCIntersection — NPC about to cross the party's path
// Cross-ref: spec/architecture/backstage/01-director-between-scenes.md §classDiagram (NPCEntry)
// ---------------------------------------------------------------------------
export const NPCIntersectionSchema = z.object({
  npc_id: ActorId,
  approach_timing: z.string(), // e.g. "arrives at the inn by nightfall"
  purpose: z.string(),         // e.g. "carrying the cult's supply package"
});
export type NPCIntersection = z.infer<typeof NPCIntersectionSchema>;

// ---------------------------------------------------------------------------
// SpotlightNudge — per-PC nudge from the Director
// Cross-ref: spec/05-director.md §Spotlight nudge; spec/14-glossary.md §Spotlight Tracker
// ---------------------------------------------------------------------------
export const SpotlightNudgeSchema = z.object({
  pc_id: ActorId,
  reason: z.string(), // e.g. "background underused 3 scenes"
});
export type SpotlightNudge = z.infer<typeof SpotlightNudgeSchema>;

// ---------------------------------------------------------------------------
// SceneBrief — the Director's output document read by the DM agent at scene start
// Cross-ref: spec/architecture/backstage/01-director-between-scenes.md §classDiagram
//            spec/05-director.md §Outputs; spec/14-glossary.md §Scene Brief
// ---------------------------------------------------------------------------
export const SceneBriefSchema = z.object({
  scene_id: SceneId,

  // What is visibly different since the party last looked — faction clock evidence, NPC moves, etc.
  pressure: z.string(),

  // Director pacing call for this scene
  pacing_call: PacingCallSchema,

  // Which PC needs the spotlight and why (nullable = no nudge this scene)
  spotlight_nudge: SpotlightNudgeSchema.nullable(),

  // 1-2 foreshadow seeds the Director has selected for this scene
  planted_seeds: z.array(ForeshadowSeedRefSchema),

  // NPCs the Director expects to intersect the party
  npc_intersections: z.array(NPCIntersectionSchema),

  // Short strings of visible evidence from advanced faction clocks
  faction_evidence: z.array(z.string()),

  // "fail, but…" hooks pre-seeded for likely check failures
  // Cross-ref: spec/05-director.md §Fail-forward by default
  fail_forward_hooks: z.array(z.string()),
});
export type SceneBrief = z.infer<typeof SceneBriefSchema>;

// ---------------------------------------------------------------------------
// SceneTranscriptEntry — one turn's worth of narration in hot memory
// Cross-ref: spec/14-glossary.md §Hot Memory, §Beat (turn)
//            spec/02-tools-orchestration.md §One beat (pseudocode)
// ---------------------------------------------------------------------------
export const SceneTranscriptEntrySchema = z.object({
  entry_id: z.string(),       // TBD: brand as TranscriptEntryId
  scene_id: SceneId,
  turn_index: z.number().int().min(0),
  speaker_id: ActorId.nullable(),  // null for system narration or stage directions
  speaker_role: z.union([
    z.literal('dm'),
    z.literal('player'),
    z.literal('npc'),
    z.literal('companion'),
    z.literal('combat_agent'),
    z.literal('system'),
  ]),
  text: z.string(),
  world_time: WorldTime,
  wall_time: Timestamp,

  // Cross-ref: spec/08-cross-cutting.md §Summarizer (what gets preserved)
  // Metadata for the summarizer to know what this entry contains
  contains_roll_outcome: z.boolean(),
  contains_entity_introduction: z.boolean(),
  contains_decision: z.boolean(),
  contains_emotional_beat: z.boolean(),
});
export type SceneTranscriptEntry = z.infer<typeof SceneTranscriptEntrySchema>;

// ---------------------------------------------------------------------------
// Scene — the bounded narrative unit
// Cross-ref: spec/14-glossary.md §Scene, §Scene Break
// ---------------------------------------------------------------------------
export const SceneStatusSchema = z.union([
  z.literal('active'),
  z.literal('closed'),
]);
export type SceneStatus = z.infer<typeof SceneStatusSchema>;

export const SceneSchema = z.object({
  id: SceneId,
  location_id: LocationId,
  actors_present: z.array(ActorId),
  status: SceneStatusSchema,

  // The scene brief the Director wrote before this scene opened (null for session-first scene)
  brief: SceneBriefSchema.nullable(),

  opened_at: Timestamp,
  closed_at: Timestamp.nullable(),

  // The warm summary produced when this scene was closed; null while active
  warm_summary: z.string().nullable(),
});
export type Scene = z.infer<typeof SceneSchema>;

// src/schema/campaign-state.ts
// Cross-ref: design/05-director.md §Inputs (faction clocks, spotlight tracker, NPC schedule, foreshadow queue)
//            design/architecture/backstage/01-director-between-scenes.md §Inputs
//            design/14-glossary.md §Director, §Spotlight Tracker, §Faction Clock, §Foreshadow Queue
//
// CampaignState is the Director-owned runtime state that spans scenes and sessions.
// It is NOT the full game state — that lives across many SQLite tables. This is
// specifically the Director's backstage state as described in design/05-director.md.
import { z } from 'zod';
import { FactionId, ActorId, SceneId, WorldTime, Timestamp } from './common.js';
import { ForeshadowSeedSchema } from './foreshadow.js';

// ---------------------------------------------------------------------------
// FactionClockState — current runtime state of one faction's progress clock
// Cross-ref: design/05-director.md §Faction clocks; design/14-glossary.md §Faction Clock
// NOTE: This is the *runtime* state slice. The authored clock definition lives in
//       campaigns/.../factions/*.md; this is the SQLite-persisted current state.
// ---------------------------------------------------------------------------
export const FactionClockStateSchema = z.object({
  faction_id: FactionId,
  clock_name: z.string(),
  segments: z.number().int().positive(),
  filled: z.number().int().nonnegative(),
  // Structural invariant: filled cannot exceed segments
  // Cross-ref: design/13-risks-tripwires.md — HP/clock invariants enforced structurally
  last_advanced_at: WorldTime.nullable(),
  evidence_on_last_advance: z.string().nullable(), // visible evidence injected into scene brief
}).strict().refine(
  (c) => c.filled <= c.segments,
  { message: 'filled cannot exceed segments', path: ['filled'] },
);
export type FactionClockState = z.infer<typeof FactionClockStateSchema>;

// ---------------------------------------------------------------------------
// SpotlightRecord — per-actor scene-centrality count
// Cross-ref: design/05-director.md §Spotlight tracker; design/14-glossary.md §Spotlight Tracker
// The Director nudges spotlight toward underserved PCs using this counter.
// ---------------------------------------------------------------------------
export const SpotlightRecordSchema = z.record(
  z.string(), // ActorId (as string for record key)
  z.number().int().nonnegative(), // number of scenes this PC has been central in
);
export type SpotlightRecord = z.infer<typeof SpotlightRecordSchema>;

// ---------------------------------------------------------------------------
// NPCScheduleEntry — one NPC's current off-screen position and intent
// Cross-ref: design/architecture/backstage/01-director-between-scenes.md §Inputs (Off-screen NPC schedule)
// The Director uses this to decide which NPCs are about to intersect the party.
// ---------------------------------------------------------------------------
export const NPCScheduleEntrySchema = z.object({
  npc_id: ActorId,
  current_location_id: z.string().nullable(), // LocationId as string
  intent: z.string(), // e.g. "moving cult supplies south via the forest road"
  last_seen_at: WorldTime.nullable(),
  last_seen_in_scene: SceneId.nullable(),
}).strict();
export type NPCScheduleEntry = z.infer<typeof NPCScheduleEntrySchema>;

// ---------------------------------------------------------------------------
// CampaignState — Director-owned backstage state
// Cross-ref: design/05-director.md §Inputs
// ---------------------------------------------------------------------------
export const CampaignStateSchema = z.object({
  campaign_id: z.string().min(1),

  // Faction clocks: one entry per faction with an explicit progress clock
  faction_clocks: z.array(FactionClockStateSchema),

  // Spotlight tracker: maps actor_id → number of scenes as central figure
  // Cross-ref: design/14-glossary.md §Spotlight Tracker
  spotlight_tracker: SpotlightRecordSchema,

  // Off-screen NPC schedule: where each named NPC is and what they're doing
  // Cross-ref: design/architecture/backstage/01-director-between-scenes.md §Inputs
  npc_schedule: z.array(NPCScheduleEntrySchema),

  // Foreshadow queue: seeds available to be planted by the Director
  // Cross-ref: design/14-glossary.md §Foreshadow Queue / Foreshadow Seed
  foreshadow_queue: z.array(ForeshadowSeedSchema),

  // Last time the Director ran (null before first scene break)
  last_director_run_at: Timestamp.nullable(),

  // The scene the Director's last brief was written for (null before first run)
  last_brief_scene_id: SceneId.nullable(),
}).strict();
export type CampaignState = z.infer<typeof CampaignStateSchema>;

// ---------------------------------------------------------------------------
// Test factories
// ---------------------------------------------------------------------------
export function makeFactionClockState(
  overrides: Partial<FactionClockState> = {},
): FactionClockState {
  return FactionClockStateSchema.parse({
    faction_id: 'cult_of_red_sigil',
    clock_name: 'The Rite Advances',
    segments: 4,
    filled: 1,
    last_advanced_at: null,
    evidence_on_last_advance: null,
    ...overrides,
  });
}

export function makeCampaignState(overrides: Partial<CampaignState> = {}): CampaignState {
  return CampaignStateSchema.parse({
    campaign_id: 'test_smallest',
    faction_clocks: [],
    spotlight_tracker: {},
    npc_schedule: [],
    foreshadow_queue: [],
    last_director_run_at: null,
    last_brief_scene_id: null,
    ...overrides,
  });
}

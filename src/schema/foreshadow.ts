// src/schema/foreshadow.ts
// Cross-ref: spec/05-director.md §Foreshadowing queue
//            spec/14-glossary.md §Foreshadow Queue / Foreshadow Seed
//            spec/architecture/backstage/01-director-between-scenes.md §classDiagram
//            campaigns/test_smallest/foreshadow/cult_symbol.md (concrete example)
import { z } from 'zod';
import { ForeshadowSeedId, BeatId, SceneId, Timestamp } from './common';

// ---------------------------------------------------------------------------
// ForeshadowSeed — a planted hint waiting to be delivered into a scene
// Cross-ref: spec/14-glossary.md §Foreshadow Queue / Foreshadow Seed
//            spec/architecture/backstage/01-director-between-scenes.md §classDiagram (ForeshadowSeed)
//            campaigns/test_smallest/foreshadow/cult_symbol.md
// ---------------------------------------------------------------------------
export const ForeshadowSeedSchema = z.object({
  id: ForeshadowSeedId,

  // Human-readable title / identifier
  title: z.string(), // e.g. "The Red Hand-Print"

  // Short description of the seed artifact or clue
  description: z.string(),

  // Tags used by the Director to match seeds to the current scene's location/situation
  // Cross-ref: spec/architecture/backstage/01-director-between-scenes.md §classDiagram
  context_tags: z.array(z.string()), // e.g. ["cult_of_red_sigil", "south_road", "visual_marker"]

  // Where / how the DM should surface this seed in the scene
  suggested_placement: z.string(),   // e.g. "surface if party asks about road news"

  // The campaign beat this seed pays off at (i.e., it should be planted before this beat)
  pays_off_at_beat: BeatId.nullable(), // null = general foreshadowing with no single payoff beat

  // Whether this seed has been harvested (delivered into a scene at least once)
  harvested: z.boolean(),

  // The scene where it was first planted (null until planted)
  first_planted_in_scene: SceneId.nullable(),

  // Director priority for selection (higher = more likely to be picked this scene)
  // TBD: decay / priority scoring algorithm to be designed
  priority: z.number().int().min(0).max(10),

  created_at: Timestamp,
});
export type ForeshadowSeed = z.infer<typeof ForeshadowSeedSchema>;

// ---------------------------------------------------------------------------
// ForeshadowQueue — the full collection of seeds for a campaign
// Used by the Director to select 1-2 seeds per between-scene run
// Cross-ref: spec/05-director.md §Inputs (foreshadow queue)
// ---------------------------------------------------------------------------
export const ForeshadowQueueSchema = z.object({
  campaign_id: z.string(), // CampaignId — string to avoid cross-import
  seeds: z.array(ForeshadowSeedSchema),

  // TBD: priority/decay algorithm for selecting seeds each Director run
  // Cross-ref: spec/05-director.md §Open (Foreshadow priority/decay)
});
export type ForeshadowQueue = z.infer<typeof ForeshadowQueueSchema>;

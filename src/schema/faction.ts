// src/schema/faction.ts
// Cross-ref: design/05-director.md §Faction clocks
//            design/06-generation.md §What gets generated (Factions — almost always authored)
//            design/14-glossary.md §Faction Clock
//            campaigns/test_smallest/factions/cult_of_red_sigil.md (concrete example)
import { z } from 'zod';
import { FactionId, ActorId, Timestamp, WorldTime } from './common';

// ---------------------------------------------------------------------------
// FactionClock — segmented progress bar tracking a faction's goal
// Cross-ref: design/05-director.md §Faction clocks; design/14-glossary.md §Faction Clock
// The Director advances clocks between scenes and injects visible evidence into the scene brief.
// ---------------------------------------------------------------------------
export const FactionClockSchema = z.object({
  id: z.string(),                   // TBD: brand as FactionClockId
  faction_id: FactionId,
  name: z.string(),                 // e.g. "The Rite Advances"
  segments_total: z.number().int().min(4).max(8), // 4-8 segments per design
  segments_current: z.number().int().min(0),

  // Human-readable label for each segment milestone
  segment_labels: z.array(z.string()),

  // When this clock completes, what happens? (Director reference note)
  completion_consequence: z.string(),

  // TBD: advancement rule encoding — currently authored prose in campaign markdown
  // e.g. "Director advances when party fails to intervene or when N in-world days pass"
  advancement_rule: z.string(),

  last_advanced_at: WorldTime.nullable(),
});
export type FactionClock = z.infer<typeof FactionClockSchema>;

// ---------------------------------------------------------------------------
// Faction — an organized group with a goal and members
// Cross-ref: design/06-generation.md §What gets generated; design/14-glossary.md §Faction Clock
// ---------------------------------------------------------------------------
export const FactionSchema = z.object({
  id: FactionId,
  name: z.string(),
  goal: z.string(),

  // Referenced NPC actor IDs; faction membership is also tracked in the relationships table
  member_ids: z.array(ActorId),

  // The faction's progress clock
  clock: FactionClockSchema.nullable(), // null for factions without an explicit clock

  // Current disposition toward the party as a group (0 = unknown)
  disposition_toward_party: z.number().int().min(-10).max(10),
  disposition_label: z.string().nullable(), // e.g. "unknown", "hostile", "tolerant"

  // Codex reference for vector recall of faction lore
  codex_entry_id: z.string().nullable(), // CodexEntryId — string to avoid cross-import

  // TBD: inter-faction relationships (ally / enemy / neutral / unaware) once relationship schema is settled
});
export type Faction = z.infer<typeof FactionSchema>;

// src/schema/quest.ts
// Cross-ref: spec/02-tools-orchestration.md §State reads (get_active_quests)
//            spec/02-tools-orchestration.md §State writes (mark_quest_beat)
//            spec/14-glossary.md §Beat (campaign)
// NOTE: Quest schema is a minimal sketch — the design only mentions quests in passing.
// Extend when the quest authoring format is designed.
import { z } from 'zod';
import { QuestId, ActorId, LocationId, FactionId, BeatId, WorldTime, Timestamp } from './common';

// ---------------------------------------------------------------------------
// QuestStatus
// TBD: expand states if a quest can partially succeed or have branching outcomes
// ---------------------------------------------------------------------------
export const QuestStatusSchema = z.union([
  z.literal('active'),
  z.literal('completed'),
  z.literal('failed'),
  z.literal('abandoned'), // TBD: is abandonment tracked separately?
]);
export type QuestStatus = z.infer<typeof QuestStatusSchema>;

// ---------------------------------------------------------------------------
// QuestBeat — a named step / milestone within a quest
// Cross-ref: spec/14-glossary.md §Beat (campaign) (quest beats follow the same node model)
// TBD: this is a minimal sketch; expand with clue-path validation once tripwire #18 is implemented
// ---------------------------------------------------------------------------
export const QuestBeatSchema = z.object({
  id: z.string(),           // e.g. "find_vellis", "identify_cult"
  description: z.string(),  // player-facing progress note

  // TBD: clue_edges — number of independent paths to reach this beat
  // Cross-ref: spec/13-risks-tripwires.md §18 (≥3 independent clue-paths per load-bearing conclusion)
  clue_edge_count: z.number().int().min(0), // TBD: loader validates ≥3 for required beats

  is_required: z.boolean(), // true = blocking; false = optional enrichment
  is_completed: z.boolean(),
  completed_at: WorldTime.nullable(),
  associated_location_ids: z.array(LocationId), // TBD: expand to full clue-edge graph
});
export type QuestBeat = z.infer<typeof QuestBeatSchema>;

// ---------------------------------------------------------------------------
// Quest
// TBD: full schema pending quest authoring format design (TODO-BRAINSTORM.md)
// ---------------------------------------------------------------------------
export const QuestSchema = z.object({
  id: QuestId,
  title: z.string(),
  description: z.string(), // player-facing summary

  status: QuestStatusSchema,

  // NPCs and factions that are relevant to this quest
  related_actor_ids: z.array(ActorId),  // TBD: distinguish givers vs. targets vs. participants
  related_faction_ids: z.array(FactionId),

  // Ordered beats; not all need to be completed (only required ones)
  beats: z.array(QuestBeatSchema),

  // TBD: reward schema (XP, items, reputation) once progression is locked
  // Cross-ref: spec/03-rules-combat.md §Progression & level-up

  started_at: WorldTime.nullable(),
  completed_at: WorldTime.nullable(),

  // The campaign beat that this quest originates from
  source_beat_id: BeatId.nullable(),
});
export type Quest = z.infer<typeof QuestSchema>;

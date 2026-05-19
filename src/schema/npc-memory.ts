// src/schema/npc-memory.ts
// Cross-ref: spec/04-npc-memory.md §Schema, §Decay, §Write path, §Read path
//            spec/14-glossary.md §NPC Memory, §Salience, §Valence, §Disposition, §Pinned Memory
import { z } from 'zod';
import { NPCMemoryId, ActorId, WorldTime, Timestamp } from './common';

// ---------------------------------------------------------------------------
// Valence — emotional weight of an NPC memory entry (-3 to +3)
// Cross-ref: spec/04-npc-memory.md §Schema; spec/14-glossary.md §Valence
// ---------------------------------------------------------------------------
export const ValenceSchema = z.number().int().min(-3).max(3);
export type Valence = z.infer<typeof ValenceSchema>;

// ---------------------------------------------------------------------------
// Salience — importance to this NPC (1-10)
// Cross-ref: spec/04-npc-memory.md §Schema; spec/14-glossary.md §Salience
// ---------------------------------------------------------------------------
export const SalienceSchema = z.number().int().min(1).max(10);
export type Salience = z.infer<typeof SalienceSchema>;

// ---------------------------------------------------------------------------
// NPCMemory — one memory entry from an NPC's perspective
// Cross-ref: spec/04-npc-memory.md §Schema (explicit TypeScript schema in design doc)
// ---------------------------------------------------------------------------
export const NPCMemorySchema = z.object({
  id: NPCMemoryId,
  npc_id: ActorId,

  // Short one-line summary from this NPC's point of view
  event_summary: z.string(),

  valence: ValenceSchema,
  salience: SalienceSchema,

  // Current recall strength after decay; starts at 1.0, decays toward 0.0
  // Cross-ref: spec/04-npc-memory.md §Decay
  recall_strength: z.number().min(0).max(1),

  // Which actors were involved in this event
  related_actor_ids: z.array(ActorId),

  // Pinned memories are exempt from decay (betrayals, life-saving, oath-breaking)
  // Cross-ref: spec/04-npc-memory.md §Decay; spec/14-glossary.md §Pinned Memory
  pinned: z.boolean(),

  // World time when this memory was written
  ts: WorldTime,

  // Wall-clock timestamp for ordering and decay computation
  created_at: Timestamp,

  // Vector embedding reference (stored in sqlite-vec alongside this entry)
  // Cross-ref: spec/13-risks-tripwires.md §1 (lock embedding model before first write)
  vector_ref: z.string().nullable(), // sqlite-vec rowid or null if not yet embedded
});
export type NPCMemory = z.infer<typeof NPCMemorySchema>;

// ---------------------------------------------------------------------------
// Disposition — an NPC's current stance toward a PC
// Cross-ref: spec/04-npc-memory.md §Read path; spec/14-glossary.md §Disposition
// Computed on read as base_disposition + Σ(valence-weighted memories)
// ---------------------------------------------------------------------------
export const DispositionSchema = z.object({
  npc_id: ActorId,
  target_actor_id: ActorId,
  score: z.number().int().min(-10).max(10), // computed; not stored directly in most implementations
  label: z.string(),                         // e.g. "suspicious", "grateful", "hostile"
  // TBD: define a standard label vocabulary once tone calibration is designed
});
export type Disposition = z.infer<typeof DispositionSchema>;

// ---------------------------------------------------------------------------
// DispositionDelta — change event to record when disposition shifts significantly
// Cross-ref: spec/04-npc-memory.md §Write path (commit_npc_memory updates disposition)
// ---------------------------------------------------------------------------
export const DispositionDeltaSchema = z.object({
  id: z.string(),         // TBD: brand as DispositionDeltaId
  npc_id: ActorId,
  target_actor_id: ActorId,
  delta: z.number().int(), // positive = improved, negative = worsened
  reason: z.string(),
  ts: WorldTime,
  created_at: Timestamp,
});
export type DispositionDelta = z.infer<typeof DispositionDeltaSchema>;

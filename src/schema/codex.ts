// src/schema/codex.ts
// Cross-ref: spec/architecture/backstage/02-memory-tiers-summarizer.md §Session-end → cold compaction
//            spec/14-glossary.md §Canon (Codex), §Cold Recall
//            spec/13-risks-tripwires.md §1 (lock embedding model before first vector write)
//            spec/06-generation.md §Canon commit (codex = where committed entities live)
import { z } from 'zod';
import { CodexEntryId, Timestamp, WorldTime } from './common.js';

// ---------------------------------------------------------------------------
// CodexEntityType — what kind of entity this entry describes
// Cross-ref: spec/14-glossary.md §Canon (codex), §Generator Agent
// TBD: extend when dungeon / encounter codex entries are designed
// ---------------------------------------------------------------------------
export const CodexEntityTypeSchema = z.union([
  z.literal('actor'),        // NPC, PC, monster
  z.literal('location'),     // any location node in the spatial graph
  z.literal('faction'),      // a faction with a goal and clock
  z.literal('item'),         // a narrative or flavorful item
  z.literal('quest'),        // a quest and its beat graph
  z.literal('lore'),         // free-form world lore (history, religion, culture)
  z.literal('session'),      // a session chronicle (written at session-end compaction)
  z.literal('relationship'), // a notable inter-entity relationship
  // TBD: 'encounter', 'dungeon' once those schemas are locked
]);
export type CodexEntityType = z.infer<typeof CodexEntityTypeSchema>;

// ---------------------------------------------------------------------------
// CodexEntry — one persisted record in the vector codex
// Cross-ref: spec/architecture/backstage/02-memory-tiers-summarizer.md §Session-end compaction
//            spec/06-generation.md §Canon commit ("committed to SQLite + embedded into vector codex")
// ---------------------------------------------------------------------------
export const CodexEntrySchema = z.object({
  id: CodexEntryId,

  // The entity this entry summarises (null for free-form lore entries)
  entity_id: z.string().nullable(),   // actor_id, location_id, faction_id, etc.
  entity_type: CodexEntityTypeSchema,

  // The natural-language summary injected into agent prompts on cold recall
  // Cross-ref: spec/02-tools-orchestration.md §Context budgeting (layer 6: cold recall)
  summary: z.string(),

  // sqlite-vec rowid for the embedding of this entry's summary text
  // Cross-ref: spec/13-risks-tripwires.md §1 (embedding dimension locked at DB init)
  embedding_id: z.string().nullable(), // null before the entry has been embedded

  // Arbitrary per-entry metadata (e.g. { session: 3, beat: '01_arrival', importance: 'high' })
  // TBD: define typed metadata variants per entity_type once authoring formats are settled
  metadata: z.record(z.string(), z.unknown()),

  // In-world time the entry describes (null for out-of-time lore)
  world_time: WorldTime.nullable(),

  // Wall-clock time the entry was written to the codex
  written_at: Timestamp,
}).strict();
export type CodexEntry = z.infer<typeof CodexEntrySchema>;

// ---------------------------------------------------------------------------
// Test factory
// ---------------------------------------------------------------------------
export function makeCodexEntry(overrides: Partial<CodexEntry> = {}): CodexEntry {
  return CodexEntrySchema.parse({
    id: 'codex-001',
    entity_id: 'barkeep_marta',
    entity_type: 'actor',
    summary: 'Marta Hoss is the guarded barkeep of the Drunken Goose who witnessed Vellis being led away.',
    embedding_id: null,
    metadata: {},
    world_time: null,
    written_at: Date.now(),
    ...overrides,
  });
}

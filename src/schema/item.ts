// src/schema/item.ts
// Cross-ref: spec/06-generation.md §Per-entity notes (Items), §What gets generated
//            spec/14-glossary.md §Canon (Codex)
//            campaigns/test_smallest/ (items/ directory for the loader shape)
import { z } from 'zod';
import { ItemId, ActorId } from './common';

// ---------------------------------------------------------------------------
// Item tiers — discriminated union on `tier`
// Cross-ref: spec/06-generation.md §Per-entity notes:
//   - mundane: tables only, no LLM
//   - flavorful_mundane: light LLM pass (locket with a name, half-burned letter)
//   - narrative: full LLM pass with provenance (who made it, why, what it cost)
// ---------------------------------------------------------------------------

export const MundaneItemSchema = z.object({
  id: ItemId,
  name: z.string(),
  tier: z.literal('mundane'),
  description: z.string(),
  weight_category: z.union([
    z.literal('light'),
    z.literal('medium'),
    z.literal('heavy'),
    z.literal('negligible'),
  ]),
  value_gp: z.number().min(0),
  // TBD: encumbrance is "obvious stuff: yes/no" (spec/03-rules-combat.md §Cut)
  //   so weight_category is sufficient for v1
});
export type MundaneItem = z.infer<typeof MundaneItemSchema>;

export const FlavorfulMundaneItemSchema = z.object({
  id: ItemId,
  name: z.string(),
  tier: z.literal('flavorful_mundane'),
  description: z.string(),
  weight_category: z.union([
    z.literal('light'),
    z.literal('medium'),
    z.literal('heavy'),
    z.literal('negligible'),
  ]),
  value_gp: z.number().min(0),

  // Light narrative detail — a name, a partial history, a visual hook
  flavor_text: z.string(), // e.g. "A locket engraved 'M — forgive me' on the inside"
  // TBD: current_owner_id could be added for tracking provenance at runtime
});
export type FlavorfulMundaneItem = z.infer<typeof FlavorfulMundaneItemSchema>;

export const ItemProvenanceSchema = z.object({
  creator: z.string(),       // who made it
  purpose: z.string(),       // why it was made
  cost: z.string(),          // what it cost (literal or metaphorical)
  history_beats: z.array(z.string()), // notable events in the item's history
  // TBD: link to creator actor_id if the creator is a known NPC in the codex
});
export type ItemProvenance = z.infer<typeof ItemProvenanceSchema>;

export const NarrativeItemSchema = z.object({
  id: ItemId,
  name: z.string(),
  tier: z.literal('narrative'),
  description: z.string(),
  weight_category: z.union([
    z.literal('light'),
    z.literal('medium'),
    z.literal('heavy'),
    z.literal('negligible'),
  ]),
  value_gp: z.number().min(0),

  // Full provenance — who made it, why, what it cost
  provenance: ItemProvenanceSchema,

  // Mechanical effect (narrative items may have flat bonuses or story-gated effects)
  // TBD: formal effect schema once the ~30-spell / item bonus design is locked
  // Cross-ref: spec/03-rules-combat.md §Cut (most magic-item bonuses cut; narrative effects kept)
  effect_description: z.string().nullable(),
  flat_bonus: z.number().int().nullable(), // e.g. +1 to a skill; TBD define what it applies to

  // Codex embedding reference for vector recall of item lore
  codex_entry_id: z.string().nullable(), // CodexEntryId — string to avoid cross-import
});
export type NarrativeItem = z.infer<typeof NarrativeItemSchema>;

// ---------------------------------------------------------------------------
// Item — discriminated union across all three tiers
// ---------------------------------------------------------------------------
export const ItemSchema = z.discriminatedUnion('tier', [
  MundaneItemSchema,
  FlavorfulMundaneItemSchema,
  NarrativeItemSchema,
]);
export type Item = z.infer<typeof ItemSchema>;

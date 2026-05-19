// src/schema/relationships.ts
// Cross-ref: spec/01-storage.md §Relationships table (SQL)
//            spec/14-glossary.md §Relationships Table
//            spec/02-tools-orchestration.md §State reads (get_relationships)
// The relationships table is an adjacency-list SQL structure encoding the "graph"
// of entity relationships. Avoids Neo4j; most queries are 1-2 hops.
import { z } from 'zod';
import { RelationshipId, Timestamp, WorldTime } from './common';

// ---------------------------------------------------------------------------
// RelationType — the nature of the connection between two entities
// Cross-ref: spec/14-glossary.md §Relationships Table ("who knows whom, faction memberships,
//            NPC-to-location ties, inter-NPC bonds")
// TBD: this is a sketch vocabulary; expand as campaign authoring formats are finalized
// ---------------------------------------------------------------------------
export const RelationTypeSchema = z.union([
  // Kinship and social bonds
  z.literal('kinship'),           // blood relation (parent, sibling, child, cousin, etc.)
  z.literal('romance'),           // romantic relationship (current or historical)
  z.literal('friendship'),        // positive personal bond
  z.literal('rivalry'),           // competitive antagonism (not full enmity)
  z.literal('enmity'),            // active hostility

  // Hierarchy and service
  z.literal('mentor'),            // one teaches / guides the other
  z.literal('employer'),          // one employs the other
  z.literal('ally'),              // cooperating toward shared goal

  // Obligation and debt
  z.literal('owes_debt'),         // subject owes the object a significant debt
  z.literal('owes_favor'),        // subject owes the object a minor favor

  // Faction membership and affiliation
  z.literal('faction_member'),    // subject is a member of the object faction
  z.literal('faction_contact'),   // subject has a contact in the object faction

  // Location ties
  z.literal('lives_at'),          // subject lives / is based at the object location
  z.literal('frequent_visitor'),  // subject regularly visits the object location

  // TBD: add 'knows_secret_of', 'blackmails', 'informant_for' once faction intel
  //      propagation (spec/04-npc-memory.md §Cross-NPC memory) is designed
]);
export type RelationType = z.infer<typeof RelationTypeSchema>;

// ---------------------------------------------------------------------------
// RelationshipRow — one row in the adjacency-list relationships table
// ---------------------------------------------------------------------------
export const RelationshipRowSchema = z.object({
  id: RelationshipId,

  // "Subject has relation_type toward object"
  subject_id: z.string(),   // ActorId | FactionId | LocationId — unbranded for flexibility
  subject_kind: z.string(), // 'actor' | 'faction' | 'location'

  object_id: z.string(),    // ActorId | FactionId | LocationId
  object_kind: z.string(),  // 'actor' | 'faction' | 'location'

  relation_type: RelationTypeSchema,

  // Optional qualifier or context note
  description: z.string().nullable(), // e.g. "sister, estranged since the plague year"

  // Strength of the relationship (-1.0 to 1.0); used for vector-weighted queries
  // TBD: define scoring convention once faction-intel propagation is designed
  strength: z.number().min(-1).max(1).nullable(),

  // Whether both parties know about the relationship (e.g. a secret obligation)
  is_public: z.boolean(),

  established_at: WorldTime.nullable(),
  created_at: Timestamp,
});
export type RelationshipRow = z.infer<typeof RelationshipRowSchema>;

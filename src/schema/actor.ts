// src/schema/actor.ts
// Cross-ref: design/00-overview.md §Actor abstraction
//            design/03-rules-combat.md §Conditions, §3-action economy
//            design/14-glossary.md §Actor, §Controller, §Drives, §Lines (Companion)
import { z } from 'zod';
import {
  ActorId,
  ItemId,
  ControllerSchema,
  CombatZoneSchema,
  OutcomeDegreeSchema,
} from './common';

// ---------------------------------------------------------------------------
// Condition
// Cross-ref: design/03-rules-combat.md §Pathfinder-lightweight choices (Conditions)
// ---------------------------------------------------------------------------
export const ConditionSchema = z.object({
  name: z.string(),       // e.g. 'frightened', 'prone', 'off-guard', 'dying'
  severity: z.number().int().min(0).optional(), // some conditions (frightened-1, etc.) carry a level
  duration_rounds: z.number().int().min(0).nullable(), // null = indefinite; 0 = until cleared manually
  // TBD: add `source_actor_id` when actor IDs are circular-import safe
});
export type Condition = z.infer<typeof ConditionSchema>;

// ---------------------------------------------------------------------------
// ActorSheet — mechanical stats
// Cross-ref: design/03-rules-combat.md §Keep (six ability scores, HP, AC, saves)
// This is a sketch shape; exact ability scores/saves to expand when rules are locked.
// ---------------------------------------------------------------------------
export const AbilityScoresSchema = z.object({
  str: z.number().int(),
  dex: z.number().int(),
  con: z.number().int(),
  int: z.number().int(),
  wis: z.number().int(),
  cha: z.number().int(),
});
export type AbilityScores = z.infer<typeof AbilityScoresSchema>;

export const SavesSchema = z.object({
  fort: z.number().int(),
  ref: z.number().int(),
  will: z.number().int(),
});
export type Saves = z.infer<typeof SavesSchema>;

export const ActorSheetSchema = z.object({
  hp_current: z.number().int(),
  hp_max: z.number().int(),
  ac: z.number().int(),
  level: z.number().int().min(1),
  archetype: z.string(),               // class archetype name: Fighter, Rogue, Cleric, etc.
  // TBD: extend with archetype-tier feature list once class packages are authored (design/03-rules-combat.md §Classes)
  ability_scores: AbilityScoresSchema,
  saves: SavesSchema,
  speed: z.number().int(),             // feet (used for zone transitions in travel; exact value TBD)
  actions_remaining: z.number().int().min(0).max(3),  // 3-action economy; resets per turn
  conditions: z.array(ConditionSchema),
  skills: z.record(z.string(), z.number().int()), // skill name → total modifier
  // TBD: spell slots per tradition once the ~30-spell list is authored (design/03-rules-combat.md §Cut)
  // TBD: encumbrance? Design says "obvious stuff: yes/no" only (design/03-rules-combat.md §Cut)
});
export type ActorSheet = z.infer<typeof ActorSheetSchema>;

// ---------------------------------------------------------------------------
// Companion drives and lines
// Cross-ref: design/14-glossary.md §Drives, §Lines (Companion)
//            design/architecture/party-shapes/01-solo-ai-companion.md §How the gate decides
// ---------------------------------------------------------------------------
export const DriveSchema = z.object({
  text: z.string(), // e.g. "redeem brother's memory", "protect children"
});
export type Drive = z.infer<typeof DriveSchema>;

export const LineSchema = z.object({
  text: z.string(), // e.g. "won't harm the innocent"
});
export type Line = z.infer<typeof LineSchema>;

// ---------------------------------------------------------------------------
// AgentProfile — optional sub-object for agent-controlled actors
// Cross-ref: design/00-overview.md §Actor abstraction
//            design/04-npc-memory.md §Generation seed (voice register, secret)
//            design/06-generation.md §Per-entity notes (speech_sample field name — glossary §5)
// ---------------------------------------------------------------------------
export const AgentProfileSchema = z.object({
  goals: z.array(z.string()),           // high-level intentions this actor pursues
  personality: z.array(z.string()),     // trait tags, e.g. ["pragmatic", "superstitious"]
  speech_sample: z.string(),            // canonical field name per design/14-glossary.md §Speech Sample
                                        // short text in NPC's own register; used as voice anchor
  voice_register: z.string().optional(), // prose descriptor: "terse, dry, short declarative sentences"
  secrets: z.array(z.string()),         // hidden agendas; not visible in redacted NPC views
  knowledge: z.array(z.string()),       // things this actor explicitly knows; scopes redacted view
  drives: z.array(DriveSchema).optional(),  // Companion-specific; what the character cares about
  lines: z.array(LineSchema).optional(),    // Companion-specific; what they will never do
  tactics: z.string().optional(),       // monster/NPC combat hint; e.g. "focuses spellcasters"
});
export type AgentProfile = z.infer<typeof AgentProfileSchema>;

// ---------------------------------------------------------------------------
// PendingAction — current intent before resolution
// Cross-ref: design/00-overview.md §Actor abstraction (current_intent)
//            design/02-tools-orchestration.md §One beat (pseudocode)
// ---------------------------------------------------------------------------
export const PendingActionSchema = z.object({
  description: z.string(),
  needs_check: z.boolean(),
  skill: z.string().optional(),
  dc: z.number().int().optional(),
  is_attack: z.boolean(),
  target_actor_id: ActorId.optional(),
  weapon: z.string().optional(),        // weapon/spell name for attack resolution
  result: OutcomeDegreeSchema.nullable(), // null until resolved by rules engine
  actions_cost: z.number().int().min(1).max(3), // 3-action economy cost
});
export type PendingAction = z.infer<typeof PendingActionSchema>;

// ---------------------------------------------------------------------------
// Actor — the universal abstraction for anything that takes a turn
// Cross-ref: design/00-overview.md §Actor abstraction; design/14-glossary.md §Actor
// ---------------------------------------------------------------------------
export const ActorSchema = z.object({
  id: ActorId,
  name: z.string(),
  sheet: ActorSheetSchema,

  // Controller discriminates player / AI companion / NPC / monster
  controller: ControllerSchema,

  // Present location (SQLite primary for zone tracking)
  location_id: z.string().nullable(), // LocationId — string to avoid import cycle; brand at boundary
  combat_zone: CombatZoneSchema.nullable(), // null outside combat

  // Inventory and equipment
  inventory: z.array(ItemId),
  equipped: z.record(z.string(), ItemId.nullable()), // slot name → item id; TBD: define slot enum

  // Optional fields — present for agent-controlled actors (controller: 'agent' | 'dm')
  agent_profile: AgentProfileSchema.optional(),

  // Current intent during turn resolution; null when awaiting input
  current_intent: PendingActionSchema.nullable(),

  // Voice TTS config — schema not yet finalized; see design/09-multimodality.md
  // TBD: expand to full VoiceProfile object when 09-multimodality.md is deepened
  voice_id: z.string().optional(),

  is_player_character: z.boolean(), // true for PCs, false for NPCs/monsters/companions
});
export type Actor = z.infer<typeof ActorSchema>;

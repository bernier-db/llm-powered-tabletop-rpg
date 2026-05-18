// src/schema/authored-campaign.ts
//
// Authored-campaign schemas — the shapes validated by the campaign loader against
// files under campaigns/<name>/. These are DISTINCT from the runtime schemas
// (actor.ts, location.ts, etc.) which are what SQLite rows look like at runtime.
//
// The authored shapes are intentionally looser than runtime shapes:
//   - Many fields are optional (filled in at load / generation time)
//   - IDs are plain strings (not branded; branding happens at load time)
//   - Nested YAML blocks (e.g. seed_memories, edges) may appear inline
//
// Cross-ref: design/architecture/generation/01-campaign-authoring-validation.md
//            design/14-glossary.md §Canon (the loader commits these to canon)
//
// These schemas are also used by tests/schema/test-campaign-validates.test.ts.

import { z } from 'zod';

// ─── Shared primitives ─────────────────────────────────────────────────────────

const NonEmptyString = z.string().min(1);

// ─── NPC authored (covers both PC and NPC files) ──────────────────────────────
// Source files: campaigns/test_smallest/npcs/*.yaml and *.md (frontmatter)
// Cross-ref: design/04-npc-memory.md §Schema (seed_memories)

const SeedMemoryAuthoredSchema = z.object({
  summary: NonEmptyString.optional(),
  event_summary: NonEmptyString.optional(),
  valence: z.number().int().min(-3).max(3),
  salience: z.number().int().min(1).max(10),
  pinned: z.boolean(),
}).passthrough(); // allow extra fields authoring tools may add

const SavesAuthoredSchema = z.object({
  fort: z.number().int(),
  ref: z.number().int(),
  will: z.number().int(),
}).strict();

const AbilityScoresAuthoredSchema = z.object({
  str: z.number().int(),
  dex: z.number().int(),
  con: z.number().int(),
  int: z.number().int(),
  wis: z.number().int(),
  cha: z.number().int(),
}).strict();

const EquipmentSlotAuthoredSchema = z.object({
  name: NonEmptyString,
  slot: NonEmptyString,
}).strict();

export const NPCAuthoredSchema = z.object({
  id: NonEmptyString,
  name: NonEmptyString,
  // Controller: present on PCs; omit on NPCs (defaults to 'agent')
  controller: z.enum(['human', 'agent', 'dm']).optional(),
  role: z.string().optional(),
  // PC sheet fields (flat, as in pc_aryn.yaml)
  class: z.string().optional(),
  level: z.number().int().positive().optional(),
  hp: z.number().int().nonnegative().optional(),
  max_hp: z.number().int().positive().optional(),
  ac: z.number().int().optional(),
  saves: SavesAuthoredSchema.optional(),
  ability_scores: AbilityScoresAuthoredSchema.optional(),
  skills: z.record(z.string(), z.number().int()).optional(),
  inventory: z.array(z.unknown()).optional(),
  equipment: z.array(EquipmentSlotAuthoredSchema).optional(),
  secrets: z.array(z.string()).optional(),
  hidden_agenda: z.string().nullable().optional(),
  background: z.string().optional(),
  // NPC fields
  personality: z.string().optional(),
  voice_register: z.string().optional(),
  speech_sample: z.string().optional(),
  knowledge: z.array(z.string()).optional(),
  base_disposition: z.number().int().min(-3).max(3).optional(),
  seed_memories: z.array(SeedMemoryAuthoredSchema).optional(),
  lives_in: z.string().optional(),
  faction_id: z.string().nullable().optional(),
  // Stub flag: intentionally incomplete NPCs awaiting JIT expansion
  // TBD: pending design — stub lifecycle spec
  stub: z.boolean().optional(),
}).strict();
export type NPCAuthored = z.infer<typeof NPCAuthoredSchema>;

// ─── Location authored ─────────────────────────────────────────────────────────
// Source files: campaigns/test_smallest/locations/*.md (frontmatter block)
// Cross-ref: design/07-geography.md §Schema

export const LocationAuthoredSchema = z.object({
  id: NonEmptyString,
  type: z.enum(['region', 'settlement', 'district', 'building', 'room', 'wilderness_zone']),
  parent_id: z.string().nullable().optional(),
  biome: z.string().nullable().optional(),
  coords: z.null().optional(),
  // name comes from markdown title or a name field
  name: z.string().optional(),
}).strict();
export type LocationAuthored = z.infer<typeof LocationAuthoredSchema>;

// ─── Faction authored ──────────────────────────────────────────────────────────
// Source file: campaigns/test_smallest/factions/cult_of_red_sigil.md (frontmatter)

export const FactionAuthoredSchema = z.object({
  id: NonEmptyString,
  name: NonEmptyString,
  goal: NonEmptyString,
  members: z.array(z.string()),
  // clock is in prose body, not frontmatter — not validated here
  // TBD: pending design — authored clock block validated separately by loader
}).strict();
export type FactionAuthored = z.infer<typeof FactionAuthoredSchema>;

// ─── Beat authored ─────────────────────────────────────────────────────────────
// Source file: campaigns/test_smallest/beats/01_arrival.yaml and .md (frontmatter)

export const BeatAuthoredSchema = z.object({
  id: NonEmptyString,
  location_id: NonEmptyString,
  // title comes from .yaml or md title
  title: z.string().optional(),
  description: z.string().optional(),
  npcs_present: z.array(z.string()).optional(),
  player_characters_present: z.array(z.string()).optional(),
  dm_notes: z.string().optional(),
  foreshadow_seeds_active: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
}).strict();
export type BeatAuthored = z.infer<typeof BeatAuthoredSchema>;

// ─── Foreshadow seed authored ──────────────────────────────────────────────────
// Source file: campaigns/test_smallest/foreshadow/cult_symbol.md (frontmatter)

export const ForeshadowSeedAuthoredSchema = z.object({
  id: NonEmptyString,
  context_tags: z.array(z.string()),
  pays_off_at_beat: z.string().optional(),
  // suggested_placement comes from the body, not frontmatter
}).strict();
export type ForeshadowSeedAuthored = z.infer<typeof ForeshadowSeedAuthoredSchema>;

// ─── Encounter table authored ──────────────────────────────────────────────────
// Source file: campaigns/test_smallest/encounters/forest_road.md (frontmatter)

export const EncounterTableAuthoredSchema = z.object({
  id: NonEmptyString,
  wired_to_edge: z.string().optional(),
  region_id: z.string().optional(),
}).strict();
export type EncounterTableAuthored = z.infer<typeof EncounterTableAuthoredSchema>;

// ─── Campaign root authored ────────────────────────────────────────────────────
// Source files: campaigns/test_smallest/campaign.yaml and campaign.md (frontmatter)

const SessionZeroAuthoredSchema = z.object({
  tone: z.string(),
  lethality: z.string(),
  content_lines: z.array(z.unknown()),
  veils: z.array(z.unknown()),
}).passthrough();

export const CampaignAuthoredSchema = z.object({
  // From campaign.yaml
  id: NonEmptyString.optional(),
  title: NonEmptyString.optional(),
  session_zero: SessionZeroAuthoredSchema.optional(),
  opening_scene: z.string().optional(),
  // From campaign.md frontmatter
  tone: z.string().optional(),
  lethality: z.string().optional(),
  est_sessions: z.number().int().positive().optional(),
  start_beat: z.string().optional(),
  start_location: z.string().optional(),
}).passthrough(); // campaign root files may have extra authored fields
export type CampaignAuthored = z.infer<typeof CampaignAuthoredSchema>;

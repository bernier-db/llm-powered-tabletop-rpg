// src/schema/roll-log.ts
// Cross-ref: spec/08-cross-cutting.md §Deterministic RNG per session
//            spec/13-risks-tripwires.md §8 (seed RNG, log every roll before consuming)
//            spec/02-tools-orchestration.md §Key invariants (all writes transactional + audited)
//            spec/14-glossary.md §Rules Engine
// The roll_log is the audit trail: every dice result is written here BEFORE being
// returned to the caller (tripwire #8). Enables replay, rewind, and deterministic testing.
import { z } from 'zod';
import { RollLogId, SessionId, ActorId, SceneId, OutcomeDegreeSchema, Timestamp, WorldTime } from './common';

// ---------------------------------------------------------------------------
// RollType — what kind of resolution was requested
// Cross-ref: spec/02-tools-orchestration.md §Rules engine (roll, check, attack, cast_spell, etc.)
// ---------------------------------------------------------------------------
export const RollTypeSchema = z.union([
  z.literal('check'),       // skill check via `check` tool
  z.literal('attack'),      // attack roll via `attack` tool
  z.literal('cast_spell'),  // spell resolution via `cast_spell` tool
  z.literal('save'),        // saving throw (Fort/Ref/Will)
  z.literal('initiative'),  // Perception or Stealth roll for initiative order
  z.literal('damage'),      // damage roll following a successful attack
  z.literal('healing'),     // healing roll
  z.literal('raw'),         // internal rule engine roll not surfaced to agents directly
  // TBD: add 'encounter_table' when encounter table resolution is implemented
]);
export type RollType = z.infer<typeof RollTypeSchema>;

// ---------------------------------------------------------------------------
// RollLog — one audit row per dice invocation
// Cross-ref: spec/08-cross-cutting.md §Deterministic RNG §roll_log table
// Fields match the audit requirements from tripwire #8:
//   session_id, seed_offset, actor_id, tool_name (roll_type), context
// ---------------------------------------------------------------------------
export const RollLogSchema = z.object({
  id: RollLogId,
  session_id: SessionId,

  // Position in the session's seeded RNG sequence; enables full replay
  seed_offset: z.number().int().min(0),

  // Scene context at the time of the roll
  scene_id: SceneId.nullable(),

  // Which actor triggered this roll (null for environment/table rolls)
  actor_id: ActorId.nullable(),

  roll_type: RollTypeSchema,

  // Skill or attack identifier; e.g. 'intimidation', 'longsword', 'fireball'
  skill_or_attack: z.string().nullable(),

  // DC or AC the roll was tested against; null for damage/healing rolls
  dc: z.number().int().nullable(),

  // Modifiers applied before comparing to DC (ability mod + proficiency + situational)
  // TBD: replace with structured ModifierBreakdown once modifier system is designed
  total_modifier: z.number().int().nullable(),

  // Raw d20 value (or damage dice total for damage rolls)
  raw_result: z.number().int(),

  // Final total after modifiers
  total_result: z.number().int(),

  // Four-degree outcome (null for rolls that don't map to a degree, e.g. damage)
  degree: OutcomeDegreeSchema.nullable(),

  // Brief human-readable context note (filled by the tool layer, not the LLM)
  context: z.string(), // e.g. "Aria attacks warlock with longsword"

  // Wall-clock time and in-world time at roll moment
  rolled_at: Timestamp,
  world_time: WorldTime.nullable(),
});
export type RollLog = z.infer<typeof RollLogSchema>;

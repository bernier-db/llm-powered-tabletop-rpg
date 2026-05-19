// src/schema/state-log.ts
// Cross-ref: spec/02-tools-orchestration.md §Key invariants ("All writes are transactional and audited")
//            spec/13-risks-tripwires.md §6 (no bare SQL writes outside the tool surface)
//            spec/08-cross-cutting.md §Deterministic RNG (same audit-trail discipline)
// The state_log is the audit trail for every state mutation. Combined with roll_log,
// it enables full session replay and deterministic testing.
import { z } from 'zod';
import { SessionId, ActorId, SceneId, Timestamp } from './common.js';

// ---------------------------------------------------------------------------
// StateLogEntry — one row per tool invocation that mutates state
// Cross-ref: spec/13-risks-tripwires.md §6 and §8 (transactional + audited)
// Every call to a state-write tool produces one StateLogEntry BEFORE the mutation
// is committed — the before_hash is captured first, then the write happens.
// ---------------------------------------------------------------------------
export const StateLogEntrySchema = z.object({
  id: z.string(),           // TBD: brand as StateLogId

  session_id: SessionId,
  scene_id: SceneId.nullable(),

  // The agent that invoked the tool (e.g. 'dm', 'combat', 'director')
  agent_id: ActorId.nullable(), // null for system-level mutations (loader, saves)

  // The tool function that was called (matches tool surface names in 02-tools-orchestration.md)
  tool_name: z.string(), // e.g. 'update_hp', 'set_condition', 'advance_faction_clock'

  // The validated arguments passed to the tool (post-Zod parse, pre-mutation)
  // Stored as a JSON-serialisable record; exact shape is tool-specific.
  args: z.record(z.string(), z.unknown()),

  // SHA-256 hash of the relevant state slice BEFORE the mutation
  // "relevant state slice" = whichever row(s) this tool writes to
  // TBD: define canonical serialization for the hash (JSON-stable-stringify of affected rows)
  before_hash: z.string(),

  // SHA-256 hash of the relevant state slice AFTER the mutation
  after_hash: z.string(),

  // Whether the mutation was rolled back (e.g. due to a validation error after the fact)
  rolled_back: z.boolean(),

  // Wall-clock timestamp of the mutation
  ts: Timestamp,
}).strict();
export type StateLogEntry = z.infer<typeof StateLogEntrySchema>;

// ---------------------------------------------------------------------------
// Test factory
// ---------------------------------------------------------------------------
export function makeStateLogEntry(overrides: Partial<StateLogEntry> = {}): StateLogEntry {
  return StateLogEntrySchema.parse({
    id: 'state-log-001',
    session_id: 'session-001',
    scene_id: 'scene-001',
    agent_id: 'dm-agent',
    tool_name: 'update_hp',
    args: { actor_id: 'pc-aryn', delta: -5 },
    before_hash: 'abc123',
    after_hash: 'def456',
    rolled_back: false,
    ts: Date.now(),
    ...overrides,
  });
}

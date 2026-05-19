import type { DB } from '../database.js';
import type { RollLog, RollLogId, SessionId, StateLogEntry } from '../../schema/index.js';

export interface AuditRepository {
  logRoll(roll: RollLog): void;
  logToolCall(entry: StateLogEntry): void;
  getRolls(sessionId: SessionId): RollLog[];
  getToolCalls(sessionId: SessionId): StateLogEntry[];
}

interface RollRow {
  id: string; session_id: string; seed_offset: number; scene_id: string | null;
  actor_id: string | null; roll_type: string; skill_or_attack: string | null;
  dc: number | null; total_modifier: number | null; raw_result: number;
  total_result: number; degree: string | null; context: string;
  rolled_at: number; world_time: string | null;
}

function rowToRoll(r: RollRow): RollLog {
  return {
    id: r.id, session_id: r.session_id, seed_offset: r.seed_offset,
    scene_id: r.scene_id, actor_id: r.actor_id, roll_type: r.roll_type,
    skill_or_attack: r.skill_or_attack, dc: r.dc,
    total_modifier: r.total_modifier, raw_result: r.raw_result,
    total_result: r.total_result, degree: r.degree,
    context: r.context, rolled_at: r.rolled_at, world_time: r.world_time,
  } as RollLog;
}

interface ToolCallRow {
  id: string; session_id: string; scene_id: string | null;
  agent_id: string | null; tool_name: string; args_json: string;
  before_hash: string; after_hash: string; rolled_back: number; ts: number;
}

function rowToToolCall(r: ToolCallRow): StateLogEntry {
  return {
    id: r.id, session_id: r.session_id, scene_id: r.scene_id,
    agent_id: r.agent_id, tool_name: r.tool_name,
    args: JSON.parse(r.args_json),
    before_hash: r.before_hash, after_hash: r.after_hash,
    rolled_back: r.rolled_back === 1, ts: r.ts,
  } as StateLogEntry;
}

export function createAuditRepository(db: DB): AuditRepository {
  return {
    logRoll(roll) {
      db.prepare(`INSERT INTO roll_log
        (id, session_id, seed_offset, scene_id, actor_id, roll_type,
         skill_or_attack, dc, total_modifier, raw_result, total_result,
         degree, context, rolled_at, world_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        roll.id, roll.session_id, roll.seed_offset, roll.scene_id,
        roll.actor_id, roll.roll_type, roll.skill_or_attack, roll.dc,
        roll.total_modifier, roll.raw_result, roll.total_result,
        roll.degree, roll.context, roll.rolled_at, roll.world_time,
      );
    },
    logToolCall(entry) {
      db.prepare(`INSERT INTO tool_call_log
        (id, session_id, scene_id, agent_id, tool_name, args_json,
         before_hash, after_hash, rolled_back, ts)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        entry.id, entry.session_id, entry.scene_id, entry.agent_id,
        entry.tool_name, JSON.stringify(entry.args),
        entry.before_hash, entry.after_hash,
        entry.rolled_back ? 1 : 0, entry.ts,
      );
    },
    getRolls(sessionId) {
      return (db.prepare(
        'SELECT * FROM roll_log WHERE session_id = ? ORDER BY seed_offset',
      ).all(sessionId) as RollRow[]).map(rowToRoll);
    },
    getToolCalls(sessionId) {
      return (db.prepare(
        'SELECT * FROM tool_call_log WHERE session_id = ? ORDER BY ts',
      ).all(sessionId) as ToolCallRow[]).map(rowToToolCall);
    },
  };
}

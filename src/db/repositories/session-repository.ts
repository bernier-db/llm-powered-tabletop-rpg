import type { DB } from '../database.js';
import type { SessionId, SceneId, SceneTranscriptEntry } from '../../schema/index.js';

export interface GameState {
  id: string;
  campaign_id: string;
  session_id: string;
  current_scene_id: string | null;
  turn_number: number;
  world_time: string | null;
  state_json: string;
  updated_at: number;
}

export interface SessionRepository {
  getGameState(): GameState | undefined;
  saveGameState(state: GameState): void;
  addTurn(entry: SceneTranscriptEntry): void;
  getTurns(sessionId: SessionId, sceneId: SceneId): SceneTranscriptEntry[];
}

interface TurnRow {
  id: number; session_id: string; scene_id: string; turn_index: number;
  speaker_id: string | null; speaker_role: string; text: string;
  world_time: string; wall_time: number;
  contains_roll_outcome: number; contains_entity_introduction: number;
  contains_decision: number; contains_emotional_beat: number;
}

function rowToTranscript(r: TurnRow): SceneTranscriptEntry {
  return {
    entry_id: String(r.id),
    scene_id: r.scene_id,
    turn_index: r.turn_index,
    speaker_id: r.speaker_id ?? null,
    speaker_role: r.speaker_role,
    text: r.text,
    world_time: r.world_time,
    wall_time: r.wall_time,
    contains_roll_outcome: r.contains_roll_outcome === 1,
    contains_entity_introduction: r.contains_entity_introduction === 1,
    contains_decision: r.contains_decision === 1,
    contains_emotional_beat: r.contains_emotional_beat === 1,
  } as SceneTranscriptEntry;
}

export function createSessionRepository(db: DB): SessionRepository {
  return {
    getGameState() {
      return db.prepare('SELECT * FROM game_state WHERE id = ?').get('current') as GameState | undefined;
    },
    saveGameState(state) {
      db.prepare(`INSERT OR REPLACE INTO game_state
        (id, campaign_id, session_id, current_scene_id, turn_number, world_time, state_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        state.id, state.campaign_id, state.session_id,
        state.current_scene_id, state.turn_number,
        state.world_time, state.state_json, state.updated_at,
      );
    },
    addTurn(entry) {
      db.prepare(`INSERT INTO turns
        (session_id, scene_id, turn_index, speaker_id, speaker_role, text,
         world_time, wall_time, contains_roll_outcome, contains_entity_introduction,
         contains_decision, contains_emotional_beat)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        entry.scene_id, entry.scene_id, entry.turn_index,
        entry.speaker_id, entry.speaker_role, entry.text,
        entry.world_time, entry.wall_time,
        entry.contains_roll_outcome ? 1 : 0,
        entry.contains_entity_introduction ? 1 : 0,
        entry.contains_decision ? 1 : 0,
        entry.contains_emotional_beat ? 1 : 0,
      );
    },
    getTurns(sessionId, sceneId) {
      return (db.prepare(
        'SELECT * FROM turns WHERE session_id = ? AND scene_id = ? ORDER BY turn_index',
      ).all(sessionId, sceneId) as TurnRow[]).map(rowToTranscript);
    },
  };
}

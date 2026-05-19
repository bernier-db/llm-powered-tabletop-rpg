import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import { openDatabase } from '../db/database.js';
import { applyMigrations } from '../db/migrations.js';
import { createSessionRepository } from '../db/repositories/session-repository.js';
import { createCampaignRepository } from '../db/repositories/campaign-repository.js';
import { HealthTracker } from '../health/health-tracker.js';
import { createTurnLoop } from './turn-loop.js';
import type { DB } from '../db/database.js';
import type { DMAgent } from '../agents/dm-agent.js';
import type { SessionId, SceneId } from '../schema/index.js';

const MIGRATIONS_DIR = join(import.meta.dirname, '../../migrations');

function freshDb(): DB {
  const db = openDatabase(':memory:');
  applyMigrations(db, MIGRATIONS_DIR);
  return db;
}

function seedTestData(db: DB, opts?: { skipGameState?: boolean }) {
  const sheet = JSON.stringify({
    hp_current: 20, hp_max: 20, ac: 15, level: 1, archetype: 'Fighter',
    ability_scores: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
    saves: { fort: 4, ref: 1, will: 0 }, speed: 25, actions_remaining: 3,
    conditions: [], skills: { athletics: 5 },
  });

  db.prepare(`INSERT INTO locations (id, name, type, description)
    VALUES (?, ?, ?, ?)`).run('loc-inn', 'The Drunken Goose', 'building', 'A well-worn tavern.');

  db.prepare(`INSERT INTO scenes (id, location_id, opened_at)
    VALUES (?, ?, ?)`).run('sc-1', 'loc-inn', Date.now());

  db.prepare(`INSERT INTO actors (id, name, controller, sheet_json, is_player_character, description)
    VALUES (?, ?, ?, ?, ?, ?)`).run('pc-aryn', 'Aryn', 'human', sheet, 1, 'Fighter');

  if (!opts?.skipGameState) {
    db.prepare(`INSERT INTO game_state (id, campaign_id, session_id, current_scene_id, turn_number, state_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run('current', 'camp-1', 'sess-1', 'sc-1', 0, '{}', Date.now());
  }
}

function mockDMAgent(responses: Array<{ narration: string; toolCalls?: Array<{ toolName: string; args: Record<string, unknown>; result: unknown }> }>): DMAgent {
  let callIndex = 0;
  return {
    respondToPlayer: async () => {
      const resp = responses[callIndex] ?? responses[responses.length - 1]!;
      callIndex++;
      return {
        narration: resp.narration,
        toolCalls: resp.toolCalls ?? [],
        usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
      };
    },
  } as DMAgent;
}

describe('TurnLoop', () => {
  let db: DB;
  let healthTracker: HealthTracker;

  beforeEach(() => {
    db = freshDb();
    seedTestData(db);
    healthTracker = new HealthTracker();
  });

  it('processes a full turn cycle: input → narration → persist', async () => {
    const turnLoop = createTurnLoop({
      dmAgent: mockDMAgent([{ narration: 'The tavern door swings open.' }]),
      sessionRepo: createSessionRepository(db),
      campaignRepo: createCampaignRepository(db),
      healthTracker,
      sessionId: 'sess-1',
      campaignId: 'camp-1',
    });

    const result = await turnLoop.processTurn('I open the door.');

    expect(result.narration).toBe('The tavern door swings open.');
    expect(result.phase).toBe('DONE');
    expect(result.turnNumber).toBe(0);

    const turns = createSessionRepository(db).getTurns('sess-1' as SessionId, 'sc-1' as SceneId);
    expect(turns).toHaveLength(2);
    expect(turns[0]!.speaker_role).toBe('player');
    expect(turns[0]!.text).toBe('I open the door.');
    expect(turns[1]!.speaker_role).toBe('dm');
    expect(turns[1]!.text).toBe('The tavern door swings open.');
  });

  it('increments game state turn_number by 2 per turn', async () => {
    const turnLoop = createTurnLoop({
      dmAgent: mockDMAgent([{ narration: 'First.' }, { narration: 'Second.' }]),
      sessionRepo: createSessionRepository(db),
      campaignRepo: createCampaignRepository(db),
      healthTracker,
      sessionId: 'sess-1',
      campaignId: 'camp-1',
    });

    await turnLoop.processTurn('Turn 1');
    const state1 = createSessionRepository(db).getGameState();
    expect(state1!.turn_number).toBe(2);

    await turnLoop.processTurn('Turn 2');
    const state2 = createSessionRepository(db).getGameState();
    expect(state2!.turn_number).toBe(4);
  });

  it('creates game state if none exists', async () => {
    const freshDb2 = freshDb();
    seedTestData(freshDb2, { skipGameState: true });

    const turnLoop = createTurnLoop({
      dmAgent: mockDMAgent([{ narration: 'Welcome.' }]),
      sessionRepo: createSessionRepository(freshDb2),
      campaignRepo: createCampaignRepository(freshDb2),
      healthTracker,
      sessionId: 'new-sess',
      campaignId: 'camp-1',
      defaultSceneId: 'sc-1',
    });

    const result = await turnLoop.processTurn('Hello');
    expect(result.narration).toBe('Welcome.');

    const state = createSessionRepository(freshDb2).getGameState();
    expect(state).toBeDefined();
    expect(state!.session_id).toBe('new-sess');
    freshDb2.close();
  });

  it('records health success after turn', async () => {
    const turnLoop = createTurnLoop({
      dmAgent: mockDMAgent([{ narration: 'Ok.' }]),
      sessionRepo: createSessionRepository(db),
      campaignRepo: createCampaignRepository(db),
      healthTracker,
      sessionId: 'sess-1',
      campaignId: 'camp-1',
    });

    await turnLoop.processTurn('Test');
    expect(healthTracker.getStatus('turn-loop').status).toBe('healthy');
  });

  it('reports tool call count from DM agent response', async () => {
    const turnLoop = createTurnLoop({
      dmAgent: mockDMAgent([{
        narration: 'You rolled a 15.',
        toolCalls: [
          { toolName: 'roll_dice', args: { count: 1, sides: 20 }, result: { total: 15 } },
          { toolName: 'lookup_location', args: { location_id: 'loc-1' }, result: { found: true } },
        ],
      }]),
      sessionRepo: createSessionRepository(db),
      campaignRepo: createCampaignRepository(db),
      healthTracker,
      sessionId: 'sess-1',
      campaignId: 'camp-1',
    });

    const result = await turnLoop.processTurn('I attack');
    expect(result.toolCallCount).toBe(2);
  });

  describe('startSession', () => {
    it('generates opening narration and persists first turn', async () => {
      const turnLoop = createTurnLoop({
        dmAgent: mockDMAgent([{ narration: 'The world unfolds before you...' }]),
        sessionRepo: createSessionRepository(db),
        campaignRepo: createCampaignRepository(db),
        healthTracker,
        sessionId: 'sess-1',
        campaignId: 'camp-1',
      });

      const result = await turnLoop.startSession();

      expect(result.narration).toBe('The world unfolds before you...');
      expect(result.turnNumber).toBe(0);
      expect(result.phase).toBe('DONE');

      const turns = createSessionRepository(db).getTurns('sess-1' as SessionId, 'sc-1' as SceneId);
      expect(turns).toHaveLength(1);
      expect(turns[0]!.speaker_role).toBe('dm');

      const state = createSessionRepository(db).getGameState();
      expect(state!.turn_number).toBe(1);
    });

    it('records health success', async () => {
      const turnLoop = createTurnLoop({
        dmAgent: mockDMAgent([{ narration: 'Begin.' }]),
        sessionRepo: createSessionRepository(db),
        campaignRepo: createCampaignRepository(db),
        healthTracker,
        sessionId: 'sess-1',
        campaignId: 'camp-1',
      });

      await turnLoop.startSession();
      expect(healthTracker.getStatus('turn-loop').status).toBe('healthy');
    });
  });

  describe('resumeSession', () => {
    it('generates recap from existing transcript', async () => {
      const sessionRepo = createSessionRepository(db);
      sessionRepo.saveGameState({
        id: 'current',
        campaign_id: 'camp-1',
        session_id: 'sess-1',
        current_scene_id: 'sc-1',
        turn_number: 4,
        world_time: 'Day 2',
        state_json: '{}',
        updated_at: Date.now(),
      });
      sessionRepo.addTurn('sess-1' as SessionId, {
        entry_id: 'old-1',
        scene_id: 'sc-1',
        turn_index: 0,
        speaker_id: null,
        speaker_role: 'player',
        text: 'I went to the tavern.',
        world_time: 'Day 1',
        wall_time: Date.now(),
        contains_roll_outcome: false,
        contains_entity_introduction: false,
        contains_decision: false,
        contains_emotional_beat: false,
      } as any);

      const turnLoop = createTurnLoop({
        dmAgent: mockDMAgent([{ narration: 'Last session you visited the tavern...' }]),
        sessionRepo,
        campaignRepo: createCampaignRepository(db),
        healthTracker,
        sessionId: 'sess-1',
        campaignId: 'camp-1',
      });

      const result = await turnLoop.resumeSession();

      expect(result.narration).toBe('Last session you visited the tavern...');
      expect(result.turnNumber).toBe(4);
      expect(result.phase).toBe('DONE');
    });

    it('records health success', async () => {
      const turnLoop = createTurnLoop({
        dmAgent: mockDMAgent([{ narration: 'Welcome back.' }]),
        sessionRepo: createSessionRepository(db),
        campaignRepo: createCampaignRepository(db),
        healthTracker,
        sessionId: 'sess-1',
        campaignId: 'camp-1',
      });

      await turnLoop.resumeSession();
      expect(healthTracker.getStatus('turn-loop').status).toBe('healthy');
    });
  });
});

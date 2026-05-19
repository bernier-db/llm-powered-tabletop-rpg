import { tool } from 'ai';
import { z } from 'zod';
import type { CampaignRepository } from '../db/repositories/campaign-repository.js';
import type { SessionRepository } from '../db/repositories/session-repository.js';
import type { AuditRepository } from '../db/repositories/audit-repository.js';
import { rollDice } from '../dice/dice-roller.js';
import { createLogger } from '../logger/index.js';
import type { HealthTracker } from '../health/health-tracker.js';
import type { SessionId, SceneId } from '../schema/index.js';

export interface DMToolDeps {
  campaignRepo: CampaignRepository;
  sessionRepo: SessionRepository;
  auditRepo: AuditRepository;
  healthTracker: HealthTracker;
  sessionId: string;
  sceneId: string | null;
  seedOffset: () => number;
}

const log = createLogger('dm-tools');

export function createDMTools(deps: DMToolDeps) {
  const { campaignRepo, sessionRepo, auditRepo, healthTracker, sessionId } = deps;

  return {
    lookup_location: tool({
      description: 'Look up a location by ID to get its name, type, description, and other details.',
      parameters: z.object({ location_id: z.string() }),
      execute: async ({ location_id }) => {
        const start = Date.now();
        log.info('tool call: lookup_location', { location_id });
        try {
          const location = campaignRepo.getLocation(location_id as any);
          if (!location) {
            healthTracker.recordSuccess('dm-tools');
            logToolCall(deps, 'lookup_location', { location_id }, start);
            return { found: false, location_id };
          }
          healthTracker.recordSuccess('dm-tools');
          logToolCall(deps, 'lookup_location', { location_id }, start);
          return { found: true, ...location };
        } catch (err) {
          healthTracker.recordError('dm-tools', err as Error);
          throw err;
        }
      },
    }),

    lookup_npc: tool({
      description: 'Look up an NPC by ID to get their name, personality, goals, and other profile details.',
      parameters: z.object({ npc_id: z.string() }),
      execute: async ({ npc_id }) => {
        const start = Date.now();
        log.info('tool call: lookup_npc', { npc_id });
        try {
          const actor = campaignRepo.getActor(npc_id as any);
          if (!actor) {
            healthTracker.recordSuccess('dm-tools');
            logToolCall(deps, 'lookup_npc', { npc_id }, start);
            return { found: false, npc_id };
          }
          const { agent_profile, ...rest } = actor;
          healthTracker.recordSuccess('dm-tools');
          logToolCall(deps, 'lookup_npc', { npc_id }, start);
          return { found: true, ...rest, profile: agent_profile ?? null };
        } catch (err) {
          healthTracker.recordError('dm-tools', err as Error);
          throw err;
        }
      },
    }),

    roll_dice: tool({
      description: 'Roll dice with the specified count and sides, plus an optional modifier. Used for skill checks, attack rolls, damage, etc.',
      parameters: z.object({
        count: z.number().int().min(1),
        sides: z.number().int().min(2),
        modifier: z.number().int().optional(),
        context: z.string(),
      }),
      execute: async ({ count, sides, modifier, context }) => {
        const start = Date.now();
        log.info('tool call: roll_dice', { count, sides, modifier, context });
        try {
          const offset = deps.seedOffset();
          const result = rollDice({ count, sides, modifier });

          auditRepo.logRoll({
            id: `roll-${sessionId}-${offset}`,
            session_id: sessionId,
            seed_offset: offset,
            scene_id: deps.sceneId,
            actor_id: null,
            roll_type: 'raw',
            skill_or_attack: null,
            dc: null,
            total_modifier: modifier ?? null,
            raw_result: result.rolls.reduce((a, b) => a + b, 0),
            total_result: result.total,
            degree: null,
            context,
            rolled_at: Date.now(),
            world_time: null,
          } as any);

          healthTracker.recordSuccess('dm-tools');
          logToolCall(deps, 'roll_dice', { count, sides, modifier, context }, start);
          return result;
        } catch (err) {
          healthTracker.recordError('dm-tools', err as Error);
          throw err;
        }
      },
    }),

    save_turn: tool({
      description: 'Save the current turn narration and player input to the session transcript.',
      parameters: z.object({
        narration: z.string(),
        player_input: z.string(),
      }),
      execute: async ({ narration, player_input }) => {
        const start = Date.now();
        log.info('tool call: save_turn', { narrationLength: narration.length, playerInputLength: player_input.length });
        try {
          const gameState = sessionRepo.getGameState();
          const turnIndex = gameState ? gameState.turn_number : 0;
          const sceneId = deps.sceneId ?? 'unknown';
          const now = Date.now();

          sessionRepo.addTurn(sessionId as SessionId, {
            entry_id: `turn-${sessionId}-${turnIndex}-player`,
            scene_id: sceneId,
            turn_index: turnIndex,
            speaker_id: null,
            speaker_role: 'player',
            text: player_input,
            world_time: gameState?.world_time ?? 'unknown',
            wall_time: now,
            contains_roll_outcome: false,
            contains_entity_introduction: false,
            contains_decision: false,
            contains_emotional_beat: false,
          } as any);

          sessionRepo.addTurn(sessionId as SessionId, {
            entry_id: `turn-${sessionId}-${turnIndex}-dm`,
            scene_id: sceneId,
            turn_index: turnIndex + 1,
            speaker_id: null,
            speaker_role: 'dm',
            text: narration,
            world_time: gameState?.world_time ?? 'unknown',
            wall_time: now,
            contains_roll_outcome: false,
            contains_entity_introduction: false,
            contains_decision: false,
            contains_emotional_beat: false,
          } as any);

          if (gameState) {
            sessionRepo.saveGameState({
              ...gameState,
              turn_number: turnIndex + 2,
              updated_at: now,
            });
          }

          healthTracker.recordSuccess('dm-tools');
          logToolCall(deps, 'save_turn', { narration: narration.slice(0, 100), player_input: player_input.slice(0, 100) }, start);
          return { saved: true, turn_index: turnIndex };
        } catch (err) {
          healthTracker.recordError('dm-tools', err as Error);
          throw err;
        }
      },
    }),
  };
}

function logToolCall(
  deps: DMToolDeps,
  toolName: string,
  args: Record<string, unknown>,
  startMs: number,
): void {
  const duration = Date.now() - startMs;
  log.info('tool call complete', { tool: toolName, duration });
  try {
    deps.auditRepo.logToolCall({
      id: `tc-${deps.sessionId}-${Date.now()}`,
      session_id: deps.sessionId,
      scene_id: deps.sceneId,
      agent_id: 'dm',
      tool_name: toolName,
      args,
      before_hash: '',
      after_hash: '',
      rolled_back: false,
      ts: Date.now(),
    } as any);
  } catch (err) {
    log.warn('failed to log tool call to audit', { tool: toolName, error: String(err) });
  }
}

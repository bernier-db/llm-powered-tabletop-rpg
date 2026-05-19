import { createLogger } from '../logger/index.js';
import type { DMAgent } from '../agents/dm-agent.js';
import type { SessionRepository, GameState } from '../db/repositories/session-repository.js';
import type { CampaignRepository } from '../db/repositories/campaign-repository.js';
import type { HealthTracker } from '../health/health-tracker.js';
import type { SessionId, SceneId } from '../schema/index.js';

export type TurnPhase = 'AWAITING_INPUT' | 'RESOLVING' | 'NARRATING' | 'PERSISTING' | 'DONE';

export interface TurnResult {
  narration: string;
  turnNumber: number;
  toolCallCount: number;
  phase: TurnPhase;
}

export interface TurnLoopDeps {
  dmAgent: DMAgent;
  sessionRepo: SessionRepository;
  campaignRepo: CampaignRepository;
  healthTracker: HealthTracker;
  sessionId: string;
  campaignId: string;
  defaultSceneId?: string;
}

const log = createLogger('turn-loop');

export function createTurnLoop(deps: TurnLoopDeps) {
  const { dmAgent, sessionRepo, campaignRepo, healthTracker, sessionId, campaignId } = deps;

  function resolveSceneId(state: GameState): string {
    const sceneId = state.current_scene_id ?? deps.defaultSceneId;
    if (!sceneId) {
      throw new Error('No scene_id available — set current_scene_id on game state or provide defaultSceneId');
    }
    return sceneId;
  }

  function ensureGameState(): GameState {
    let state = sessionRepo.getGameState();
    if (!state) {
      state = {
        id: 'current',
        campaign_id: campaignId,
        session_id: sessionId,
        current_scene_id: deps.defaultSceneId ?? null,
        turn_number: 0,
        world_time: null,
        state_json: '{}',
        updated_at: Date.now(),
      };
      sessionRepo.saveGameState(state);
    }
    return state;
  }

  function getTranscript(state: GameState) {
    const sceneId = resolveSceneId(state);
    return sessionRepo.getTurns(sessionId as SessionId, sceneId as SceneId);
  }

  return {
    async processTurn(playerInput: string): Promise<TurnResult> {
      const turnStart = performance.now();
      let phase: TurnPhase = 'AWAITING_INPUT';

      const state = ensureGameState();
      const turnNumber = state.turn_number;

      log.info('turn start', {
        turnNumber,
        playerInputLength: playerInput.length,
        sessionId,
      });

      phase = 'RESOLVING';
      const transcript = getTranscript(state);
      const response = await dmAgent.respondToPlayer(playerInput, state, transcript);

      phase = 'NARRATING';
      const narration = response.narration;

      phase = 'PERSISTING';
      const sceneId = resolveSceneId(state);
      const now = Date.now();

      sessionRepo.addTurn(sessionId as SessionId, {
        entry_id: `turn-${sessionId}-${turnNumber}-player`,
        scene_id: sceneId,
        turn_index: turnNumber,
        speaker_id: null,
        speaker_role: 'player',
        text: playerInput,
        world_time: state.world_time ?? 'unknown',
        wall_time: now,
        contains_roll_outcome: false,
        contains_entity_introduction: false,
        contains_decision: false,
        contains_emotional_beat: false,
      } as any);

      sessionRepo.addTurn(sessionId as SessionId, {
        entry_id: `turn-${sessionId}-${turnNumber + 1}-dm`,
        scene_id: sceneId,
        turn_index: turnNumber + 1,
        speaker_id: null,
        speaker_role: 'dm',
        text: narration,
        world_time: state.world_time ?? 'unknown',
        wall_time: now,
        contains_roll_outcome: response.toolCalls.some(tc => tc.toolName === 'roll_dice'),
        contains_entity_introduction: false,
        contains_decision: false,
        contains_emotional_beat: false,
      } as any);

      sessionRepo.saveGameState({
        ...state,
        turn_number: turnNumber + 2,
        updated_at: now,
      });

      healthTracker.recordSuccess('turn-loop');

      phase = 'DONE';
      const durationMs = Math.round(performance.now() - turnStart);

      log.info('turn complete', {
        turnNumber,
        narrationLength: narration.length,
        toolCallCount: response.toolCalls.length,
        durationMs,
      });

      return {
        narration,
        turnNumber,
        toolCallCount: response.toolCalls.length,
        phase,
      };
    },

    async startSession(): Promise<TurnResult> {
      log.info('session start', { sessionId, campaignId });
      const state = ensureGameState();

      const openingPrompt = 'Begin the adventure. Describe the opening scene based on the campaign setting. Set the tone and introduce the world. End with what the player sees and hears.';

      const transcript = getTranscript(state);
      const response = await dmAgent.respondToPlayer(openingPrompt, state, transcript);

      const now = Date.now();
      const sceneId = resolveSceneId(state);

      sessionRepo.addTurn(sessionId as SessionId, {
        entry_id: `turn-${sessionId}-0-dm`,
        scene_id: sceneId,
        turn_index: 0,
        speaker_id: null,
        speaker_role: 'dm',
        text: response.narration,
        world_time: state.world_time ?? 'unknown',
        wall_time: now,
        contains_roll_outcome: false,
        contains_entity_introduction: true,
        contains_decision: false,
        contains_emotional_beat: false,
      } as any);

      sessionRepo.saveGameState({
        ...state,
        turn_number: 1,
        updated_at: now,
      });

      healthTracker.recordSuccess('turn-loop');

      log.info('session started', {
        narrationLength: response.narration.length,
        toolCallCount: response.toolCalls.length,
      });

      return {
        narration: response.narration,
        turnNumber: 0,
        toolCallCount: response.toolCalls.length,
        phase: 'DONE',
      };
    },

    async resumeSession(): Promise<TurnResult> {
      log.info('session resume', { sessionId });
      const state = ensureGameState();
      const transcript = getTranscript(state);

      const recapPrompt = 'The player is returning to a session in progress. Briefly recap what has happened so far based on the transcript history, then ask what the player would like to do next.';

      const response = await dmAgent.respondToPlayer(recapPrompt, state, transcript);

      healthTracker.recordSuccess('turn-loop');

      log.info('session resumed', {
        narrationLength: response.narration.length,
        turnNumber: state.turn_number,
      });

      return {
        narration: response.narration,
        turnNumber: state.turn_number,
        toolCallCount: response.toolCalls.length,
        phase: 'DONE',
      };
    },
  };
}

export type TurnLoop = ReturnType<typeof createTurnLoop>;

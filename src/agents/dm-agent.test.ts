import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthTracker } from '../health/health-tracker.js';

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

import { generateText } from 'ai';
import { createDMAgent } from './dm-agent.js';
import type { ContextAssembler } from './context-assembler.js';
import type { GameState } from '../db/repositories/session-repository.js';

const mockedGenerateText = vi.mocked(generateText);

function fakeAssembler(): ContextAssembler {
  return {
    buildSystemPrompt: () => 'You are the DM.',
    buildMessages: (transcript) =>
      transcript.map(t => ({
        role: (t.speaker_role === 'player' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: t.text,
      })),
  };
}

const baseState: GameState = {
  id: 'current',
  campaign_id: 'camp-1',
  session_id: 'sess-1',
  current_scene_id: 'sc-1',
  turn_number: 0,
  world_time: 'Day 1',
  state_json: '{}',
  updated_at: Date.now(),
};

describe('DMAgent', () => {
  let healthTracker: HealthTracker;

  beforeEach(() => {
    healthTracker = new HealthTracker();
    vi.clearAllMocks();
  });

  it('produces narration from generateText response', async () => {
    mockedGenerateText.mockResolvedValueOnce({
      text: 'The tavern door creaks open...',
      usage: { promptTokens: 100, completionTokens: 50 },
      steps: [{ text: 'The tavern door creaks open...' }],
      toolCalls: [],
      toolResults: [],
      finishReason: 'stop',
      response: { id: 'r1' },
      roundtrips: [],
      responseMessages: [],
      warnings: [],
      request: {},
      experimental_providerMetadata: {},
      logprobs: undefined,
      reasoning: undefined,
      reasoningDetails: [],
      sources: [],
      files: [],
    } as any);

    const agent = createDMAgent({
      contextAssembler: fakeAssembler(),
      healthTracker,
      getModel: () => 'mock-model' as any,
      tools: {},
    });

    const result = await agent.respondToPlayer('I open the door.', baseState, []);

    expect(result.narration).toBe('The tavern door creaks open...');
    expect(result.usage.promptTokens).toBe(100);
    expect(result.usage.completionTokens).toBe(50);
    expect(result.usage.totalTokens).toBe(150);
  });

  it('passes system prompt and messages to generateText', async () => {
    mockedGenerateText.mockResolvedValueOnce({
      text: 'Response.',
      usage: { promptTokens: 50, completionTokens: 20 },
      steps: [],
      toolCalls: [],
      toolResults: [],
      finishReason: 'stop',
    } as any);

    const agent = createDMAgent({
      contextAssembler: fakeAssembler(),
      healthTracker,
      getModel: () => 'mock-model' as any,
      tools: {},
      maxSteps: 5,
    });

    await agent.respondToPlayer('Hello', baseState, []);

    expect(mockedGenerateText).toHaveBeenCalledOnce();
    const callArgs = mockedGenerateText.mock.calls[0]![0]!;
    expect(callArgs.system).toBe('You are the DM.');
    expect(callArgs.maxSteps).toBe(5);
    expect(callArgs.messages).toEqual([
      { role: 'user', content: 'Hello' },
    ]);
  });

  it('includes prior transcript in messages', async () => {
    mockedGenerateText.mockResolvedValueOnce({
      text: 'Continue...',
      usage: { promptTokens: 50, completionTokens: 20 },
      steps: [],
      toolCalls: [],
      toolResults: [],
      finishReason: 'stop',
    } as any);

    const agent = createDMAgent({
      contextAssembler: fakeAssembler(),
      healthTracker,
      getModel: () => 'mock-model' as any,
      tools: {},
    });

    const transcript = [
      { speaker_role: 'player', text: 'I look around.' },
      { speaker_role: 'dm', text: 'You see a dark room.' },
    ] as any[];

    await agent.respondToPlayer('I search the chest.', baseState, transcript);

    const callArgs = mockedGenerateText.mock.calls[0]![0]!;
    expect(callArgs.messages).toEqual([
      { role: 'user', content: 'I look around.' },
      { role: 'assistant', content: 'You see a dark room.' },
      { role: 'user', content: 'I search the chest.' },
    ]);
  });

  it('records health success on successful response', async () => {
    mockedGenerateText.mockResolvedValueOnce({
      text: 'Success!',
      usage: { promptTokens: 10, completionTokens: 10 },
      steps: [],
      toolCalls: [],
      toolResults: [],
      finishReason: 'stop',
    } as any);

    const agent = createDMAgent({
      contextAssembler: fakeAssembler(),
      healthTracker,
      getModel: () => 'mock-model' as any,
      tools: {},
    });

    await agent.respondToPlayer('Test', baseState, []);

    expect(healthTracker.getStatus('dm-agent').status).toBe('healthy');
  });

  it('returns graceful narration on error and records health failure', async () => {
    mockedGenerateText.mockRejectedValueOnce(new Error('API unavailable'));

    const agent = createDMAgent({
      contextAssembler: fakeAssembler(),
      healthTracker,
      getModel: () => 'mock-model' as any,
      tools: {},
    });

    const result = await agent.respondToPlayer('Test', baseState, []);

    expect(result.narration).toContain('hazy');
    expect(result.usage.totalTokens).toBe(0);
    expect(healthTracker.getStatus('dm-agent').status).not.toBe('healthy');
  });

  it('collects tool calls via onStepFinish callback', async () => {
    mockedGenerateText.mockImplementationOnce(async (opts: any) => {
      if (opts.onStepFinish) {
        opts.onStepFinish({
          toolCalls: [
            { toolName: 'roll_dice', args: { count: 1, sides: 20 } },
          ],
          toolResults: [{ rolls: [15], total: 15, modifier: 0, formula: '1d20' }],
        });
        opts.onStepFinish({
          toolCalls: [
            { toolName: 'lookup_location', args: { location_id: 'loc-1' } },
          ],
          toolResults: [{ found: true, name: 'Tavern' }],
        });
      }
      return {
        text: 'You roll a 15.',
        usage: { promptTokens: 80, completionTokens: 30 },
        steps: [{}, {}],
        toolCalls: [],
        toolResults: [],
        finishReason: 'stop',
      };
    });

    const agent = createDMAgent({
      contextAssembler: fakeAssembler(),
      healthTracker,
      getModel: () => 'mock-model' as any,
      tools: {},
    });

    const result = await agent.respondToPlayer('I attack', baseState, []);

    expect(result.toolCalls).toHaveLength(2);
    expect(result.toolCalls[0]!.toolName).toBe('roll_dice');
    expect(result.toolCalls[1]!.toolName).toBe('lookup_location');
    expect(result.toolCalls[0]!.result).toEqual({ rolls: [15], total: 15, modifier: 0, formula: '1d20' });
  });

  it('defaults maxSteps to 10', async () => {
    mockedGenerateText.mockResolvedValueOnce({
      text: 'Ok.',
      usage: { promptTokens: 10, completionTokens: 5 },
      steps: [],
      toolCalls: [],
      toolResults: [],
      finishReason: 'stop',
    } as any);

    const agent = createDMAgent({
      contextAssembler: fakeAssembler(),
      healthTracker,
      getModel: () => 'mock-model' as any,
      tools: {},
    });

    await agent.respondToPlayer('Test', baseState, []);

    const callArgs = mockedGenerateText.mock.calls[0]![0]!;
    expect(callArgs.maxSteps).toBe(10);
  });
});

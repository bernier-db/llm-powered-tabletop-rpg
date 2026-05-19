import { generateText } from 'ai';
import type { ToolSet } from 'ai';
import { createLogger } from '../logger/index.js';
import type { HealthTracker } from '../health/health-tracker.js';
import type { ContextAssembler } from './context-assembler.js';
import type { GameState } from '../db/repositories/session-repository.js';
import type { SceneTranscriptEntry } from '../schema/index.js';

export interface ToolCallRecord {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface DMResponse {
  narration: string;
  toolCalls: ToolCallRecord[];
  usage: TokenUsage;
}

export interface DMAgentDeps {
  contextAssembler: ContextAssembler;
  healthTracker: HealthTracker;
  getModel: () => Parameters<typeof generateText>[0]['model'];
  tools: ToolSet;
  maxSteps?: number;
}

const log = createLogger('dm-agent');

export function createDMAgent(deps: DMAgentDeps) {
  const { contextAssembler, healthTracker, getModel, tools } = deps;
  const maxSteps = deps.maxSteps ?? 10;

  return {
    async respondToPlayer(
      playerInput: string,
      state: GameState,
      transcript: SceneTranscriptEntry[],
    ): Promise<DMResponse> {
      const systemPrompt = contextAssembler.buildSystemPrompt(state);
      const messages = contextAssembler.buildMessages(transcript);
      messages.push({ role: 'user' as const, content: playerInput });

      const model = getModel();
      const start = performance.now();
      const collectedToolCalls: ToolCallRecord[] = [];

      log.info('dm-agent generateText start', {
        model: String(model),
        messageCount: messages.length,
        maxSteps,
      });

      try {
        const result = await generateText({
          model,
          system: systemPrompt,
          messages,
          tools,
          maxSteps,
          onStepFinish({ toolCalls, toolResults }) {
            if (toolCalls) {
              for (let i = 0; i < toolCalls.length; i++) {
                const tc = toolCalls[i]!;
                collectedToolCalls.push({
                  toolName: tc.toolName,
                  args: tc.args as Record<string, unknown>,
                  result: toolResults[i],
                });
              }
            }
          },
        });

        const usage: TokenUsage = {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.promptTokens + result.usage.completionTokens,
        };

        const narration = result.text;
        const durationMs = Math.round(performance.now() - start);

        log.info('dm-agent generateText complete', {
          durationMs,
          steps: result.steps.length,
          toolCallCount: collectedToolCalls.length,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
        });

        healthTracker.recordSuccess('dm-agent');

        return { narration, toolCalls: collectedToolCalls, usage };
      } catch (err) {
        const durationMs = Math.round(performance.now() - start);
        log.error('dm-agent generateText failed', {
          error: String(err),
          durationMs,
        });
        healthTracker.recordError('dm-agent', err as Error);

        return {
          narration: 'The memory is hazy... the threads of fate blur for a moment before the world reasserts itself. What do you do?',
          toolCalls: collectedToolCalls,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
      }
    },
  };
}

export type DMAgent = ReturnType<typeof createDMAgent>;

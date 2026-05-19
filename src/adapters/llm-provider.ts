import type { ZodObject, ZodRawShape } from 'zod';
import { createLogger } from '../logger/index.js';

const log = createLogger('llm');

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

export interface GenerateResult {
  text: string;
  usage: { promptTokens: number; completionTokens: number };
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  toolName: string;
  args: Record<string, unknown>;
}

export interface ToolCallResult {
  text: string;
  toolCalls: ToolCall[];
  usage: { promptTokens: number; completionTokens: number };
}

export interface LLMProvider {
  generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult>;
  generateWithTools(prompt: string, tools: ToolDefinition[], options?: GenerateOptions): Promise<ToolCallResult>;
}

export function createVercelLLMProvider(opts?: {
  provider?: 'openrouter' | 'ollama';
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}): LLMProvider {
  const providerName = opts?.provider ?? (process.env['LLM_PROVIDER'] as 'openrouter' | 'ollama' | undefined) ?? 'ollama';
  const modelId = opts?.model ?? process.env['LLM_MODEL'] ?? 'llama3.1:8b';

  async function getModel() {
    if (providerName === 'openrouter') {
      const { createOpenAI } = await import('@ai-sdk/openai');
      const apiKey = opts?.apiKey ?? process.env['OPENROUTER_API_KEY'] ?? '';
      const openrouter = createOpenAI({
        apiKey,
        baseURL: opts?.baseUrl ?? 'https://openrouter.ai/api/v1',
      });
      return openrouter(modelId);
    }
    const { createOllama } = await import('ollama-ai-provider');
    const ollamaProvider = createOllama({
      baseURL: opts?.baseUrl ?? process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434',
    });
    return ollamaProvider(modelId);
  }

  function buildCallSettings(options?: GenerateOptions) {
    const settings: Record<string, unknown> = {};
    if (options?.maxTokens !== undefined) settings['maxTokens'] = options.maxTokens;
    if (options?.temperature !== undefined) settings['temperature'] = options.temperature;
    if (options?.stopSequences !== undefined) settings['stopSequences'] = options.stopSequences;
    return settings;
  }

  return {
    async generate(prompt, options) {
      const { generateText } = await import('ai');
      const model = await getModel();
      const start = performance.now();
      const result = await generateText({
        model,
        prompt,
        ...buildCallSettings(options),
      });
      log.debug('llm generate', {
        provider: providerName,
        model: modelId,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        ms: Math.round(performance.now() - start),
      });
      return { text: result.text, usage: result.usage };
    },

    async generateWithTools(prompt, tools, options) {
      const { generateText } = await import('ai');
      const { z } = await import('zod');
      const model = await getModel();
      const start = performance.now();
      const toolDefs: Record<string, { description: string; parameters: ZodObject<ZodRawShape> }> = {};
      for (const t of tools) {
        toolDefs[t.name] = { description: t.description, parameters: z.object({}) };
      }
      const result = await generateText({
        model,
        prompt,
        tools: toolDefs,
        ...buildCallSettings(options),
      });
      const toolCalls: ToolCall[] = result.toolCalls.map((tc) => ({
        toolName: tc.toolName,
        args: tc.args as Record<string, unknown>,
      }));
      log.debug('llm generateWithTools', {
        provider: providerName,
        model: modelId,
        toolCalls: toolCalls.length,
        ms: Math.round(performance.now() - start),
      });
      return { text: result.text, toolCalls, usage: result.usage };
    },
  };
}

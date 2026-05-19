import { createLogger } from '../logger/index.js';

const log = createLogger('embedding');

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  dimensions(): number;
}

export function createOllamaEmbeddingProvider(opts?: {
  model?: string;
  baseUrl?: string;
}): EmbeddingProvider {
  const model = opts?.model ?? process.env['EMBEDDING_MODEL'] ?? 'nomic-embed-text';
  const baseUrl = opts?.baseUrl ?? process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434';
  let cachedDimensions: number | undefined;

  async function doEmbed(texts: string[]): Promise<number[][]> {
    const { embed, embedMany } = await import('ai');
    const { createOllama } = await import('ollama-ai-provider');
    const ollamaProvider = createOllama({ baseURL: baseUrl });
    const embeddingModel = ollamaProvider.textEmbeddingModel(model);

    const start = performance.now();
    if (texts.length === 1) {
      const result = await embed({ model: embeddingModel, value: texts[0]! });
      cachedDimensions = result.embedding.length;
      log.debug('embed single', { model, dims: cachedDimensions, ms: Math.round(performance.now() - start) });
      return [result.embedding];
    }
    const result = await embedMany({ model: embeddingModel, values: texts });
    if (result.embeddings[0]) cachedDimensions = result.embeddings[0].length;
    log.debug('embed batch', { model, count: texts.length, ms: Math.round(performance.now() - start) });
    return result.embeddings;
  }

  return {
    async embed(text) {
      const [vec] = await doEmbed([text]);
      return vec!;
    },
    async embedBatch(texts) {
      return doEmbed(texts);
    },
    dimensions() {
      if (cachedDimensions === undefined) throw new Error('Call embed() first to detect dimensions');
      return cachedDimensions;
    },
  };
}

import { tool } from 'ai';
import { z } from 'zod';

export function createS03Stubs() {
  return {
    handoff_to_npc: tool({
      description: 'Hand off narration to an NPC actor agent for a dialogue sequence.',
      parameters: z.object({
        npc_id: z.string(),
        context: z.string(),
      }),
      execute: async () => {
        throw new Error('Not available in S02 — implemented in S03');
      },
    }),

    save_memory: tool({
      description: 'Save a memory for an NPC based on what just happened in the scene.',
      parameters: z.object({
        npc_id: z.string(),
        event_summary: z.string(),
        valence: z.number().int().min(-3).max(3),
        salience: z.number().int().min(1).max(10),
      }),
      execute: async () => {
        throw new Error('Not available in S02 — implemented in S03');
      },
    }),

    recall_npc_memories: tool({
      description: 'Recall relevant memories for an NPC to inform their behavior and dialogue.',
      parameters: z.object({
        npc_id: z.string(),
        limit: z.number().int().min(1).max(20).optional(),
      }),
      execute: async () => {
        throw new Error('Not available in S02 — implemented in S03');
      },
    }),
  };
}

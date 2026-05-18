// src/schema/codex.test.ts
import { describe, it, expect } from 'vitest';
import { CodexEntrySchema, CodexEntityTypeSchema, makeCodexEntry } from './codex.js';

describe('CodexEntityTypeSchema', () => {
  it('accepts all defined entity types', () => {
    const types = ['actor', 'location', 'faction', 'item', 'quest', 'lore', 'session', 'relationship'] as const;
    for (const t of types) {
      expect(() => CodexEntityTypeSchema.parse(t)).not.toThrow();
    }
  });

  it('rejects an unlisted entity type', () => {
    expect(() => CodexEntityTypeSchema.parse('dungeon')).toThrow();
  });
});

describe('CodexEntrySchema', () => {
  it('accepts a valid codex entry via factory', () => {
    const entry = makeCodexEntry();
    expect(() => CodexEntrySchema.parse(entry)).not.toThrow();
  });

  it('accepts an entry with no entity_id (free-form lore)', () => {
    expect(() =>
      CodexEntrySchema.parse(
        makeCodexEntry({ entity_id: null, entity_type: 'lore' }),
      ),
    ).not.toThrow();
  });

  it('accepts an entry with a non-null embedding_id', () => {
    expect(() =>
      CodexEntrySchema.parse(makeCodexEntry({ embedding_id: 'vec-row-12345' })),
    ).not.toThrow();
  });

  it('accepts arbitrary metadata key-value pairs', () => {
    expect(() =>
      CodexEntrySchema.parse(
        makeCodexEntry({
          metadata: { session: 1, beat: '01_arrival', importance: 'high', tags: ['cult', 'npc'] },
        }),
      ),
    ).not.toThrow();
  });

  it('rejects an entry with extra top-level fields (strict mode)', () => {
    expect(() =>
      CodexEntrySchema.parse({ ...makeCodexEntry(), undocumented: true }),
    ).toThrow();
  });

  it('rejects an entry with an unknown entity_type', () => {
    expect(() =>
      CodexEntrySchema.parse(makeCodexEntry({ entity_type: 'encounter' as never })),
    ).toThrow();
  });

  it('rejects an entry missing the summary field', () => {
    const { summary: _s, ...noSummary } = makeCodexEntry();
    expect(() => CodexEntrySchema.parse(noSummary)).toThrow();
  });

  it('accepts a session chronicle entry (session-end compaction output)', () => {
    // Cross-ref: design/architecture/backstage/02-memory-tiers-summarizer.md §Session-end compaction
    expect(() =>
      CodexEntrySchema.parse(
        makeCodexEntry({
          entity_id: 'session-001',
          entity_type: 'session',
          summary: 'The party arrived in Stonebridge. They met Marta and learned of Vellis\'s disappearance.',
          embedding_id: 'vec-row-001',
          metadata: { session_number: 1, beats_fired: ['01_arrival'] },
          world_time: 'Day 3–4',
        }),
      ),
    ).not.toThrow();
  });
});

// src/schema/state-log.test.ts
import { describe, it, expect } from 'vitest';
import { StateLogEntrySchema, makeStateLogEntry } from './state-log.js';

describe('StateLogEntrySchema', () => {
  it('accepts a valid state log entry via factory', () => {
    const entry = makeStateLogEntry();
    expect(() => StateLogEntrySchema.parse(entry)).not.toThrow();
  });

  it('accepts a rolled-back entry', () => {
    const entry = makeStateLogEntry({ rolled_back: true });
    expect(() => StateLogEntrySchema.parse(entry)).not.toThrow();
  });

  it('accepts an entry with null agent_id (system-level mutation)', () => {
    const entry = makeStateLogEntry({ agent_id: null });
    expect(() => StateLogEntrySchema.parse(entry)).not.toThrow();
  });

  it('accepts an entry with null scene_id (pre-scene or load-time mutation)', () => {
    const entry = makeStateLogEntry({ scene_id: null });
    expect(() => StateLogEntrySchema.parse(entry)).not.toThrow();
  });

  it('rejects an entry with extra fields (strict mode)', () => {
    expect(() =>
      StateLogEntrySchema.parse({ ...makeStateLogEntry(), undocumented_field: true }),
    ).toThrow();
  });

  it('rejects an entry missing before_hash', () => {
    const { before_hash: _bh, ...noHash } = makeStateLogEntry();
    expect(() => StateLogEntrySchema.parse(noHash)).toThrow();
  });

  it('accepts args as any record of unknown values', () => {
    const entry = makeStateLogEntry({
      tool_name: 'set_condition',
      args: { actor_id: 'pc_aryn', condition: 'frightened', severity: 2, duration_rounds: 3 },
    });
    expect(() => StateLogEntrySchema.parse(entry)).not.toThrow();
  });

  it('rejects an entry with non-string tool_name', () => {
    expect(() =>
      StateLogEntrySchema.parse({ ...makeStateLogEntry(), tool_name: 42 }),
    ).toThrow();
  });
});

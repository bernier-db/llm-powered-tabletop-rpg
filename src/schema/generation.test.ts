// src/schema/generation.test.ts
import { describe, it, expect } from 'vitest';
import {
  GenerationRequestSchema,
  GenerationResultSchema,
  GenerationConstraintsSchema,
  VarietyStateSchema,
  GenerationHookSchema,
  makeGenerationRequest,
  makeGenerationResult,
  makeGenerationConstraints,
  makeVarietyState,
} from './generation.js';

describe('GenerationConstraintsSchema', () => {
  it('accepts an empty constraints object', () => {
    expect(() => GenerationConstraintsSchema.parse({})).not.toThrow();
  });

  it('accepts constraints with all optional fields', () => {
    expect(() =>
      GenerationConstraintsSchema.parse(
        makeGenerationConstraints({
          must_include: ['has a secret', 'merchant class'],
          must_exclude: ['gruff', 'grizzled'],
          theme_hints: ['church-adjacent', 'debt-haunted'],
          tone_override: 'gritty',
        }),
      ),
    ).not.toThrow();
  });

  it('rejects extra fields (strict mode)', () => {
    expect(() =>
      GenerationConstraintsSchema.parse({ must_include: [], extra_field: true }),
    ).toThrow();
  });
});

describe('VarietyStateSchema', () => {
  it('accepts an empty variety state', () => {
    expect(() =>
      VarietyStateSchema.parse(makeVarietyState()),
    ).not.toThrow();
  });

  it('accepts populated variety state', () => {
    expect(() =>
      VarietyStateSchema.parse(
        makeVarietyState({
          traits_used: ['pragmatic', 'superstitious'],
          names_used: ['Marta', 'Vellis'],
          archetypes_used: ['barkeep', 'merchant'],
        }),
      ),
    ).not.toThrow();
  });

  it('rejects extra fields (strict mode)', () => {
    expect(() =>
      VarietyStateSchema.parse({ ...makeVarietyState(), bonus_field: 'x' }),
    ).toThrow();
  });
});

describe('GenerationRequestSchema', () => {
  it('accepts a valid request via factory', () => {
    const req = makeGenerationRequest();
    expect(() => GenerationRequestSchema.parse(req)).not.toThrow();
  });

  it('accepts a request with a non-empty canon_snapshot (critical: tripwire #2)', () => {
    // Cross-ref: design/13-risks-tripwires.md §2 — every generation starts with canon retrieval
    const req = makeGenerationRequest({
      canon_snapshot: [
        {
          id: 'codex-001',
          entity_id: 'region_greyhill',
          entity_type: 'location',
          summary: 'Greyhill is a temperate hill region with a suppressed cult history.',
          embedding_id: 'vec-001',
          metadata: {},
          world_time: null,
          written_at: Date.now(),
        },
      ],
    });
    expect(() => GenerationRequestSchema.parse(req)).not.toThrow();
  });

  it('rejects a request missing parent', () => {
    const { parent: _p, ...noParent } = makeGenerationRequest();
    expect(() => GenerationRequestSchema.parse(noParent)).toThrow();
  });

  it('rejects a request missing canon_snapshot', () => {
    const { canon_snapshot: _cs, ...noSnapshot } = makeGenerationRequest();
    expect(() => GenerationRequestSchema.parse(noSnapshot)).toThrow();
  });
});

describe('GenerationHookSchema', () => {
  it('accepts a valid follow-up hook', () => {
    expect(() =>
      GenerationHookSchema.parse({
        trigger: "party asks about Vellis's brother",
        entity_kind: 'actor',
        hint: "Vellis's brother; merchant; estranged; location: lowland city",
        priority: 5,
      }),
    ).not.toThrow();
  });

  it('rejects priority above 10', () => {
    expect(() =>
      GenerationHookSchema.parse({
        trigger: 'x',
        entity_kind: 'actor',
        hint: 'x',
        priority: 11,
      }),
    ).toThrow();
  });

  it('rejects priority below 0', () => {
    expect(() =>
      GenerationHookSchema.parse({
        trigger: 'x',
        entity_kind: 'actor',
        hint: 'x',
        priority: -1,
      }),
    ).toThrow();
  });

  it('rejects extra fields (strict mode)', () => {
    expect(() =>
      GenerationHookSchema.parse({
        trigger: 'x',
        entity_kind: 'actor',
        hint: 'x',
        priority: 0,
        bonus: true,
      }),
    ).toThrow();
  });
});

describe('GenerationResultSchema', () => {
  it('accepts a valid result via factory', () => {
    const result = makeGenerationResult();
    expect(() => GenerationResultSchema.parse(result)).not.toThrow();
  });

  it('accepts a result with follow_up_hooks', () => {
    const result = makeGenerationResult({
      follow_up_hooks: [
        { trigger: "ask about brother", entity_kind: 'actor', hint: 'estranged merchant', priority: 3 },
      ],
    });
    expect(() => GenerationResultSchema.parse(result)).not.toThrow();
  });

  it('rejects a result missing committed_id', () => {
    const { committed_id: _cid, ...noId } = makeGenerationResult();
    expect(() => GenerationResultSchema.parse(noId)).toThrow();
  });
});

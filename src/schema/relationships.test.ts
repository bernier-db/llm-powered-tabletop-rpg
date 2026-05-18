// src/schema/relationships.test.ts
import { describe, it, expect } from 'vitest';
import { RelationshipRowSchema, RelationTypeSchema } from './relationships.js';

const validRow = {
  id: 'rel-001',
  subject_id: 'barkeep_marta',
  subject_kind: 'actor',
  object_id: 'vellis',
  object_kind: 'actor',
  relation_type: 'friendship' as const,
  description: 'Chess partners for a decade; she considers him a friend.',
  strength: 0.7,
  is_public: true,
  established_at: 'Day 1, session start',
  created_at: Date.now(),
};

describe('RelationTypeSchema', () => {
  it('accepts all defined relation types', () => {
    const types = [
      'kinship', 'romance', 'friendship', 'rivalry', 'enmity',
      'mentor', 'employer', 'ally', 'owes_debt', 'owes_favor',
      'faction_member', 'faction_contact', 'lives_at', 'frequent_visitor',
    ] as const;
    for (const t of types) {
      expect(() => RelationTypeSchema.parse(t)).not.toThrow();
    }
  });

  it('rejects an undefined relation type', () => {
    expect(() => RelationTypeSchema.parse('blackmails')).toThrow();
  });

  it('rejects an empty string', () => {
    expect(() => RelationTypeSchema.parse('')).toThrow();
  });
});

describe('RelationshipRowSchema', () => {
  it('accepts a valid friendship relationship', () => {
    expect(() => RelationshipRowSchema.parse(validRow)).not.toThrow();
  });

  it('accepts a faction membership with null established_at and null description', () => {
    expect(() =>
      RelationshipRowSchema.parse({
        id: 'rel-002',
        subject_id: 'vellis',
        subject_kind: 'actor',
        object_id: 'cult_of_red_sigil',
        object_kind: 'faction',
        relation_type: 'faction_member',
        description: null,
        strength: null,
        is_public: false,
        established_at: null,
        created_at: Date.now(),
      }),
    ).not.toThrow();
  });

  it('rejects strength above +1', () => {
    expect(() =>
      RelationshipRowSchema.parse({ ...validRow, strength: 1.1 }),
    ).toThrow();
  });

  it('rejects strength below -1', () => {
    expect(() =>
      RelationshipRowSchema.parse({ ...validRow, strength: -1.1 }),
    ).toThrow();
  });

  it('accepts strength of exactly -1 and +1 (boundary values)', () => {
    expect(() =>
      RelationshipRowSchema.parse({ ...validRow, strength: -1 }),
    ).not.toThrow();
    expect(() =>
      RelationshipRowSchema.parse({ ...validRow, id: 'rel-003', strength: 1 }),
    ).not.toThrow();
  });

  it('rejects a relationship with an unknown relation_type', () => {
    expect(() =>
      RelationshipRowSchema.parse({ ...validRow, relation_type: 'likes' }),
    ).toThrow();
  });

  it('rejects a relationship missing subject_id', () => {
    const { subject_id: _s, ...noSubject } = validRow;
    expect(() => RelationshipRowSchema.parse(noSubject)).toThrow();
  });
});

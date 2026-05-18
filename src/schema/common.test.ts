// src/schema/common.test.ts
import { describe, it, expect } from 'vitest';
import {
  ControllerSchema,
  OutcomeDegreeSchema,
  LethalitySchema,
  ToneSchema,
  PacingSchema,
  CombatGranularitySchema,
  CombatZoneSchema,
  PacingCallSchema,
  DirectionSchema,
  TerrainSchema,
  DangerLevelSchema,
  EntityRefSchema,
  ActorId,
  LocationId,
} from './common.js';

describe('ControllerSchema', () => {
  it('accepts all three valid controller values', () => {
    expect(() => ControllerSchema.parse('human')).not.toThrow();
    expect(() => ControllerSchema.parse('agent')).not.toThrow();
    expect(() => ControllerSchema.parse('dm')).not.toThrow();
  });

  it('rejects an unknown controller', () => {
    expect(() => ControllerSchema.parse('robot')).toThrow();
  });

  it('rejects an empty string', () => {
    expect(() => ControllerSchema.parse('')).toThrow();
  });

  it('rejects null', () => {
    expect(() => ControllerSchema.parse(null)).toThrow();
  });
});

describe('OutcomeDegreeSchema', () => {
  it('accepts all four degree values', () => {
    expect(() => OutcomeDegreeSchema.parse('crit_fail')).not.toThrow();
    expect(() => OutcomeDegreeSchema.parse('fail')).not.toThrow();
    expect(() => OutcomeDegreeSchema.parse('success')).not.toThrow();
    expect(() => OutcomeDegreeSchema.parse('crit_success')).not.toThrow();
  });

  it('rejects an unlisted degree', () => {
    expect(() => OutcomeDegreeSchema.parse('partial')).toThrow();
  });

  it('rejects a number', () => {
    expect(() => OutcomeDegreeSchema.parse(1)).toThrow();
  });

  it('is case-sensitive', () => {
    expect(() => OutcomeDegreeSchema.parse('Crit_Fail')).toThrow();
  });
});

describe('LethalitySchema', () => {
  it('accepts cinematic, standard, brutal', () => {
    expect(() => LethalitySchema.parse('cinematic')).not.toThrow();
    expect(() => LethalitySchema.parse('standard')).not.toThrow();
    expect(() => LethalitySchema.parse('brutal')).not.toThrow();
  });

  it('rejects an unlisted value', () => {
    expect(() => LethalitySchema.parse('hardcore')).toThrow();
  });
});

describe('ToneSchema', () => {
  it('accepts all nine registered tones', () => {
    const tones = ['heroic', 'gritty', 'horror', 'comedy', 'political', 'pulp', 'mystery', 'cozy', 'weird'];
    for (const t of tones) {
      expect(() => ToneSchema.parse(t)).not.toThrow();
    }
  });

  it('rejects an unlisted tone', () => {
    expect(() => ToneSchema.parse('romantic')).toThrow();
  });

  it('rejects undefined', () => {
    expect(() => ToneSchema.parse(undefined)).toThrow();
  });
});

describe('DangerLevelSchema', () => {
  it('accepts 0 through 4', () => {
    for (const d of [0, 1, 2, 3, 4]) {
      expect(() => DangerLevelSchema.parse(d)).not.toThrow();
    }
  });

  it('rejects 5 (out of range)', () => {
    expect(() => DangerLevelSchema.parse(5)).toThrow();
  });

  it('rejects -1 (below range)', () => {
    expect(() => DangerLevelSchema.parse(-1)).toThrow();
  });

  it('rejects a non-integer danger level string', () => {
    expect(() => DangerLevelSchema.parse('high')).toThrow();
  });
});

describe('PacingCallSchema', () => {
  it('accepts escalate, breather, hold', () => {
    expect(() => PacingCallSchema.parse('escalate')).not.toThrow();
    expect(() => PacingCallSchema.parse('breather')).not.toThrow();
    expect(() => PacingCallSchema.parse('hold')).not.toThrow();
  });

  it('rejects an unlisted pacing call', () => {
    expect(() => PacingCallSchema.parse('pause')).toThrow();
  });
});

describe('DirectionSchema', () => {
  it('accepts all 8 compass directions', () => {
    for (const d of ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']) {
      expect(() => DirectionSchema.parse(d)).not.toThrow();
    }
  });

  it('rejects lowercase direction', () => {
    expect(() => DirectionSchema.parse('n')).toThrow();
  });
});

describe('EntityRefSchema', () => {
  it('accepts a valid entity ref', () => {
    expect(() => EntityRefSchema.parse({ id: 'region_greyhill', kind: 'location' })).not.toThrow();
  });

  it('rejects extra fields (strict)', () => {
    expect(() =>
      EntityRefSchema.parse({ id: 'x', kind: 'location', extra: true }),
    ).toThrow();
  });

  it('rejects missing kind', () => {
    expect(() => EntityRefSchema.parse({ id: 'x' })).toThrow();
  });
});

describe('Branded IDs', () => {
  it('ActorId accepts any non-empty string at runtime (branding is compile-time only)', () => {
    expect(() => ActorId.parse('barkeep_marta')).not.toThrow();
  });

  it('LocationId accepts any non-empty string at runtime', () => {
    expect(() => LocationId.parse('location_drunken_goose')).not.toThrow();
  });
});

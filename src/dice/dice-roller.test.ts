import { describe, it, expect } from 'vitest';
import { rollDice } from './dice-roller.js';

describe('rollDice', () => {
  it('produces deterministic output with same seed', () => {
    const a = rollDice({ count: 4, sides: 6, seed: 42 });
    const b = rollDice({ count: 4, sides: 6, seed: 42 });
    expect(a.rolls).toEqual(b.rolls);
    expect(a.total).toBe(b.total);
  });

  it('produces different output with different seeds', () => {
    const a = rollDice({ count: 4, sides: 6, seed: 1 });
    const b = rollDice({ count: 4, sides: 6, seed: 2 });
    expect(a.rolls).not.toEqual(b.rolls);
  });

  it('calculates correct total with positive modifier', () => {
    const result = rollDice({ count: 2, sides: 6, modifier: 3, seed: 100 });
    const expectedTotal = result.rolls.reduce((a, b) => a + b, 0) + 3;
    expect(result.total).toBe(expectedTotal);
    expect(result.modifier).toBe(3);
  });

  it('calculates correct total with negative modifier', () => {
    const result = rollDice({ count: 1, sides: 20, modifier: -2, seed: 55 });
    const expectedTotal = result.rolls[0]! - 2;
    expect(result.total).toBe(expectedTotal);
    expect(result.modifier).toBe(-2);
  });

  it('defaults modifier to 0', () => {
    const result = rollDice({ count: 1, sides: 6, seed: 10 });
    expect(result.modifier).toBe(0);
    expect(result.total).toBe(result.rolls[0]);
  });

  it('returns correct roll count', () => {
    const result = rollDice({ count: 5, sides: 8, seed: 99 });
    expect(result.rolls).toHaveLength(5);
  });

  it('constrains all values to 1..sides', () => {
    const result = rollDice({ count: 100, sides: 20, seed: 777 });
    for (const roll of result.rolls) {
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(20);
    }
  });

  it('formats formula without modifier', () => {
    const result = rollDice({ count: 2, sides: 6, seed: 1 });
    expect(result.formula).toBe('2d6');
  });

  it('formats formula with positive modifier', () => {
    const result = rollDice({ count: 1, sides: 20, modifier: 5, seed: 1 });
    expect(result.formula).toBe('1d20+5');
  });

  it('formats formula with negative modifier', () => {
    const result = rollDice({ count: 3, sides: 8, modifier: -1, seed: 1 });
    expect(result.formula).toBe('3d8-1');
  });

  it('produces varied output without seed', () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const r = rollDice({ count: 3, sides: 20 });
      results.add(r.rolls.join(','));
    }
    expect(results.size).toBeGreaterThan(1);
  });
});

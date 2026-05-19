import { createLogger } from '../logger/index.js';
import type { Logger } from '../logger/index.js';

export interface DiceParams {
  count: number;
  sides: number;
  modifier?: number;
  seed?: number;
}

export interface DiceResult {
  rolls: number[];
  total: number;
  modifier: number;
  formula: string;
}

const log: Logger = createLogger('DiceRoller');

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rollDice(params: DiceParams): DiceResult {
  const { count, sides, modifier = 0, seed } = params;

  let rng: () => number;
  if (seed !== undefined) {
    rng = mulberry32(seed);
  } else {
    const buf = new Uint32Array(1);
    rng = () => {
      crypto.getRandomValues(buf);
      return buf[0]! / 4294967296;
    };
  }

  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(rng() * sides) + 1);
  }

  const sum = rolls.reduce((a, b) => a + b, 0);
  const total = sum + modifier;
  const modStr = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : '';
  const formula = `${count}d${sides}${modStr}`;

  log.debug('dice rolled', { formula, rolls, total });

  return { rolls, total, modifier, formula };
}

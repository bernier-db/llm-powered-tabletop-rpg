import type { ActorId, OutcomeDegree } from '../schema/common.js';

export interface Action {
  id: string;
  name: string;
  type: 'move' | 'standard' | 'free' | 'reaction';
  description: string;
}

export interface ActionContext {
  actorId: ActorId;
  targetId?: ActorId;
  skill?: string;
  dc?: number;
  modifiers?: number[];
  rawRoll?: number;
}

export interface ActionResult {
  action: Action;
  degree: OutcomeDegree;
  total: number;
  dc: number;
  effects: string[];
}

export interface RuleSystem {
  resolveAction(action: Action, context: ActionContext): ActionResult;
  calculateDC(skill: string, difficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'extreme'): number;
  getAvailableActions(actorId: ActorId): Action[];
}

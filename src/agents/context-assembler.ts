import type { CampaignRepository } from '../db/repositories/campaign-repository.js';
import type { SessionRepository, GameState } from '../db/repositories/session-repository.js';
import type { SceneTranscriptEntry } from '../schema/index.js';
import type { SessionZero } from '../schema/session-zero.js';
import { createLogger } from '../logger/index.js';

export interface ContextAssemblerDeps {
  campaignRepo: CampaignRepository;
  sessionRepo: SessionRepository;
}

export interface ContextAssemblerConfig {
  maxTokens?: number;
  campaignSetting?: string;
  sessionZero?: SessionZero;
}

export interface ContextAssembler {
  buildSystemPrompt(state: GameState): string;
  buildMessages(transcript: SceneTranscriptEntry[]): Array<{ role: 'user' | 'assistant'; content: string }>;
}

const log = createLogger('context-assembler');

const DEFAULT_MAX_TOKENS = 4000;
const CHARS_PER_TOKEN = 4;

interface PromptSection {
  label: string;
  priority: number;
  content: string;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function buildSections(
  deps: ContextAssemblerDeps,
  config: ContextAssemblerConfig,
  state: GameState,
): PromptSection[] {
  const sections: PromptSection[] = [];

  sections.push({
    label: 'dm-role',
    priority: 0,
    content: [
      'You are the Dungeon Master for this RPG session.',
      'Narrate in a vivid tabletop voice. Describe what the players see, hear, and feel.',
      'Use the tools available to you: look up locations and NPCs for accurate details, roll dice for mechanical resolution, and save each turn to maintain session history.',
      'When a tool call fails, narrate around the gap gracefully — never expose tool errors to the player.',
      'Stay faithful to the campaign canon. Do not invent major NPCs, locations, or plot points that contradict established lore.',
      'If a player goes off-script, improvise within the tone and setting, steering back naturally.',
    ].join('\n'),
  });

  if (config.sessionZero) {
    const sz = config.sessionZero;
    const lines = [
      `Tone: ${sz.tone}`,
      `Lethality: ${sz.lethality}`,
      `Pacing: ${sz.pacing}`,
      `Combat: ${sz.combat_granularity}`,
    ];
    if (sz.content_lines.length > 0) {
      lines.push(`Hard limits (never include): ${sz.content_lines.map(l => l.topic).join(', ')}`);
    }
    if (sz.veils.length > 0) {
      lines.push(`Veils (fade to black): ${sz.veils.map(v => v.topic).join(', ')}`);
    }
    sections.push({ label: 'session-zero', priority: 1, content: lines.join('\n') });
  }

  if (config.campaignSetting) {
    sections.push({ label: 'campaign-setting', priority: 2, content: config.campaignSetting });
  }

  if (state.current_scene_id) {
    const loc = (() => {
      try {
        const stateJson = JSON.parse(state.state_json) as Record<string, unknown>;
        const locId = stateJson['current_location_id'] as string | undefined;
        if (locId) return deps.campaignRepo.getLocation(locId as any);
      } catch { /* state_json may not have location */ }
      return undefined;
    })();
    if (loc) {
      sections.push({
        label: 'current-location',
        priority: 3,
        content: `Current location: ${loc.name} (${loc.type})\n${loc.description}`,
      });
    }
  }

  const npcs = deps.campaignRepo.listActors().filter(a => !a.is_player_character && a.agent_profile);
  if (npcs.length > 0) {
    const npcLines = npcs.map(npc => {
      const profile = npc.agent_profile!;
      const personality = profile.personality.join(', ');
      return `- ${npc.name} (${npc.id}): ${personality}`;
    });
    sections.push({ label: 'nearby-npcs', priority: 4, content: `NPCs:\n${npcLines.join('\n')}` });
  }

  const quests = deps.campaignRepo.listQuests().filter(
    (q: any) => q.status === 'active',
  );
  if (quests.length > 0) {
    const questLines = quests.map((q: any) => `- ${q.title}: ${q.description}`);
    sections.push({ label: 'active-quests', priority: 5, content: `Active quests:\n${questLines.join('\n')}` });
  }

  return sections;
}

function assembleWithBudget(sections: PromptSection[], maxTokens: number): string {
  sections.sort((a, b) => a.priority - b.priority);

  let totalTokens = 0;
  const included: string[] = [];

  for (const section of sections) {
    const sectionTokens = estimateTokens(section.content);
    if (totalTokens + sectionTokens > maxTokens) {
      log.debug('section dropped — over token budget', {
        label: section.label,
        sectionTokens,
        totalTokens,
        maxTokens,
      });
      continue;
    }
    included.push(`## ${section.label}\n${section.content}`);
    totalTokens += sectionTokens;
  }

  log.debug('system prompt assembled', { sectionsIncluded: included.length, totalTokens, maxTokens });
  return included.join('\n\n');
}

export function createContextAssembler(
  deps: ContextAssemblerDeps,
  config: ContextAssemblerConfig = {},
): ContextAssembler {
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;

  return {
    buildSystemPrompt(state) {
      const sections = buildSections(deps, config, state);
      return assembleWithBudget(sections, maxTokens);
    },

    buildMessages(transcript) {
      return transcript.map(entry => ({
        role: (entry.speaker_role === 'player' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: entry.text,
      }));
    },
  };
}

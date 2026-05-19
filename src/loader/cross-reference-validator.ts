import type { RepairReport } from './repair-report.js';
import type { NPCAuthored, LocationAuthored, FactionAuthored, BeatAuthored, ForeshadowSeedAuthored } from '../schema/index.js';

export interface ParsedEntities {
  campaign: Record<string, unknown> | null;
  npcs: Map<string, NPCAuthored>;
  locations: Map<string, LocationAuthored>;
  factions: Map<string, FactionAuthored>;
  beats: Map<string, BeatAuthored>;
  foreshadowSeeds: Map<string, ForeshadowSeedAuthored>;
}

export function validateCrossReferences(
  entities: ParsedEntities,
  report: RepairReport,
): void {
  const locationIds = new Set(entities.locations.keys());
  const actorIds = new Set(entities.npcs.keys());
  const beatIds = new Set(entities.beats.keys());
  const factionIds = new Set(entities.factions.keys());

  for (const [id, npc] of entities.npcs) {
    if (npc.lives_in && !locationIds.has(npc.lives_in)) {
      report.addIssue(
        `npcs/${id}`, 'lives_in', 'warning',
        `Actor "${id}" references location "${npc.lives_in}" which does not exist`,
      );
    }
    if (npc.faction_id && !factionIds.has(npc.faction_id)) {
      report.addIssue(
        `npcs/${id}`, 'faction_id', 'warning',
        `Actor "${id}" references faction "${npc.faction_id}" which does not exist`,
      );
    }
  }

  for (const [id, faction] of entities.factions) {
    for (const memberId of faction.members) {
      if (!actorIds.has(memberId)) {
        report.addIssue(
          `factions/${id}`, 'members', 'warning',
          `Faction "${id}" references member "${memberId}" which does not exist`,
        );
      }
    }
  }

  for (const [id, beat] of entities.beats) {
    if (!locationIds.has(beat.location_id)) {
      report.addIssue(
        `beats/${id}`, 'location_id', 'warning',
        `Beat "${id}" references location "${beat.location_id}" which does not exist`,
      );
    }
    if (beat.npcs_present) {
      for (const npcId of beat.npcs_present) {
        if (!actorIds.has(npcId)) {
          report.addIssue(
            `beats/${id}`, 'npcs_present', 'warning',
            `Beat "${id}" references NPC "${npcId}" which does not exist`,
          );
        }
      }
    }
    if (beat.dependencies) {
      for (const dep of beat.dependencies) {
        if (!beatIds.has(dep)) {
          report.addIssue(
            `beats/${id}`, 'dependencies', 'warning',
            `Beat "${id}" depends on beat "${dep}" which does not exist`,
          );
        }
      }
    }
    if (beat.foreshadow_seeds_active) {
      for (const seedId of beat.foreshadow_seeds_active) {
        if (!entities.foreshadowSeeds.has(seedId)) {
          report.addIssue(
            `beats/${id}`, 'foreshadow_seeds_active', 'warning',
            `Beat "${id}" references foreshadow seed "${seedId}" which does not exist`,
          );
        }
      }
    }
  }

  for (const [id, seed] of entities.foreshadowSeeds) {
    if (seed.pays_off_at_beat && !beatIds.has(seed.pays_off_at_beat)) {
      report.addIssue(
        `foreshadow/${id}`, 'pays_off_at_beat', 'warning',
        `Foreshadow seed "${id}" references beat "${seed.pays_off_at_beat}" which does not exist`,
      );
    }
  }

  for (const [id, loc] of entities.locations) {
    if (loc.parent_id && !locationIds.has(loc.parent_id)) {
      report.addIssue(
        `locations/${id}`, 'parent_id', 'warning',
        `Location "${id}" references parent location "${loc.parent_id}" which does not exist`,
      );
    }
  }

  const campaignData = entities.campaign;
  if (campaignData) {
    if (typeof campaignData['start_location'] === 'string' && !locationIds.has(campaignData['start_location'])) {
      report.addIssue(
        'campaign', 'start_location', 'warning',
        `Campaign references start_location "${campaignData['start_location']}" which does not exist`,
      );
    }
    if (typeof campaignData['start_beat'] === 'string' && !beatIds.has(campaignData['start_beat'])) {
      report.addIssue(
        'campaign', 'start_beat', 'warning',
        `Campaign references start_beat "${campaignData['start_beat']}" which does not exist`,
      );
    }
  }
}

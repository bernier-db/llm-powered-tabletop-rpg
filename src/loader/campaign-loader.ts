import { readdirSync, statSync } from 'node:fs';
import { join, extname, relative, dirname, basename } from 'node:path';
import type { ZodType, ZodObject, ZodRawShape } from 'zod';
import type { DB } from '../db/index.js';
import {
  CampaignAuthoredSchema, NPCAuthoredSchema, LocationAuthoredSchema,
  FactionAuthoredSchema, BeatAuthoredSchema, ForeshadowSeedAuthoredSchema,
  EncounterTableAuthoredSchema,
} from '../schema/index.js';
import type {
  CampaignAuthored, NPCAuthored, LocationAuthored,
  FactionAuthored, BeatAuthored, ForeshadowSeedAuthored,
} from '../schema/index.js';
import { parseFile } from './file-parser.js';
import { RepairReport } from './repair-report.js';
import { validateCrossReferences, type ParsedEntities } from './cross-reference-validator.js';
import { seedDatabase } from './db-seeder.js';
import { createLogger } from '../logger/index.js';

const log = createLogger('campaign-loader');

export interface LoadResult {
  campaignId: string;
  report: RepairReport;
  entities: ParsedEntities;
}

interface SchemaRoute {
  schema: ZodType;
  schemaName: string;
}

function lenient<T extends ZodObject<ZodRawShape>>(schema: T) {
  return schema.strip();
}

const SUBDIR_SCHEMAS: Record<string, SchemaRoute> = {
  npcs: { schema: lenient(NPCAuthoredSchema), schemaName: 'NPCAuthored' },
  locations: { schema: lenient(LocationAuthoredSchema), schemaName: 'LocationAuthored' },
  factions: { schema: lenient(FactionAuthoredSchema), schemaName: 'FactionAuthored' },
  beats: { schema: lenient(BeatAuthoredSchema), schemaName: 'BeatAuthored' },
  foreshadow: { schema: lenient(ForeshadowSeedAuthoredSchema), schemaName: 'ForeshadowSeedAuthored' },
  encounters: { schema: lenient(EncounterTableAuthoredSchema), schemaName: 'EncounterTableAuthored' },
};

export function loadCampaign(campaignDir: string, db: DB): LoadResult {
  const report = new RepairReport();
  const entities: ParsedEntities = {
    campaign: null,
    npcs: new Map(),
    locations: new Map(),
    factions: new Map(),
    beats: new Map(),
    foreshadowSeeds: new Map(),
  };
  const locationProse = new Map<string, string>();

  log.info('loading campaign', { dir: campaignDir });

  const files = walkDirectory(campaignDir);
  log.info('files discovered', { count: files.length });

  for (const filePath of files) {
    const rel = relative(campaignDir, filePath);
    const subdir = relative(campaignDir, dirname(filePath));
    const topDir = subdir === '.' ? '' : subdir.split('/')[0] ?? '';
    const stem = basename(filePath, extname(filePath));

    log.debug('parsing file', { rel });

    let parsed;
    try {
      parsed = parseFile(filePath);
    } catch (err) {
      report.addIssue(rel, 'file', 'error', `Failed to parse: ${String(err)}`);
      continue;
    }

    if (topDir === '' && (stem === 'campaign' || stem === 'campaign.md')) {
      const result = CampaignAuthoredSchema.safeParse(parsed.data);
      if (!result.success) {
        for (const issue of result.error.issues) {
          report.addIssue(rel, issue.path.join('.') || 'root', 'error', issue.message);
        }
      } else {
        entities.campaign = result.data;
      }
      continue;
    }

    const route = SUBDIR_SCHEMAS[topDir];
    if (!route) {
      report.addIssue(rel, 'directory', 'info', `Skipping file in unrecognized directory "${topDir}"`);
      continue;
    }

    const entityId = parsed.data['id'] as string | undefined;
    if (!entityId) {
      report.addIssue(rel, 'id', 'error', 'Missing required "id" field');
      continue;
    }

    if (entityId !== stem) {
      report.addIssue(
        rel, 'id', 'warning',
        `ID "${entityId}" does not match filename stem "${stem}" — convention requires ID === filename`,
        `Rename file to "${entityId}${extname(filePath)}" or change id to "${stem}"`,
      );
    }

    const result = route.schema.safeParse(parsed.data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        report.addIssue(rel, issue.path.join('.') || 'root', 'error', issue.message);
      }
      continue;
    }

    switch (topDir) {
      case 'npcs':
        entities.npcs.set(entityId, result.data as NPCAuthored);
        break;
      case 'locations':
        entities.locations.set(entityId, result.data as LocationAuthored);
        if (parsed.prose) locationProse.set(entityId, parsed.prose);
        break;
      case 'factions':
        entities.factions.set(entityId, result.data as FactionAuthored);
        break;
      case 'beats':
        entities.beats.set(entityId, result.data as BeatAuthored);
        break;
      case 'foreshadow':
        entities.foreshadowSeeds.set(entityId, result.data as ForeshadowSeedAuthored);
        break;
    }
  }

  const campaignId = (entities.campaign as CampaignAuthored | null)?.id ?? basename(campaignDir);
  log.info('parsing complete', {
    campaignId,
    npcs: entities.npcs.size,
    locations: entities.locations.size,
    factions: entities.factions.size,
    beats: entities.beats.size,
    foreshadowSeeds: entities.foreshadowSeeds.size,
    issues: report.count(),
  });

  validateCrossReferences(entities, report);

  if (report.hasErrors()) {
    log.warn('campaign has errors — skipping database seeding', {
      errors: report.count('error'),
      warnings: report.count('warning'),
    });
  } else {
    seedDatabase(db, entities, { locations: locationProse }, campaignId);
  }

  return { campaignId, report, entities };
}

function walkDirectory(dir: string): string[] {
  const results: string[] = [];
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...walkDirectory(fullPath));
    } else {
      const ext = extname(entry).toLowerCase();
      if (ext === '.md' || ext === '.yaml' || ext === '.yml') {
        results.push(fullPath);
      }
    }
  }
  return results;
}

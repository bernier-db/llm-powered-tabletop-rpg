import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { openDatabase, applyMigrations, createCampaignRepository } from '../db/index.js';
import type { DB } from '../db/index.js';
import { loadCampaign } from './campaign-loader.js';
import { configure } from '../logger/index.js';

const CAMPAIGN_DIR = join(import.meta.dirname, '../../campaigns/test_smallest');
const BROKEN_DIR = join(import.meta.dirname, '../../tests/fixtures/broken-campaign');
const MIGRATIONS_DIR = join(import.meta.dirname, '../../migrations');

configure({ level: 'error', pretty: false });

describe('campaign loader', () => {
  let db: DB;

  beforeEach(() => {
    db = openDatabase(':memory:');
    applyMigrations(db, MIGRATIONS_DIR);
  });

  afterEach(() => {
    db.close();
  });

  it('loads test_smallest into SQLite with no errors', () => {
    const result = loadCampaign(CAMPAIGN_DIR, db);

    expect(result.report.hasErrors()).toBe(false);
    expect(result.campaignId).toBe('test_smallest');
    expect(result.entities.npcs.size).toBeGreaterThan(0);
    expect(result.entities.locations.size).toBeGreaterThan(0);
  });

  it('seeds actors into the database', () => {
    loadCampaign(CAMPAIGN_DIR, db);
    const repo = createCampaignRepository(db);
    const actors = repo.listActors();

    expect(actors.length).toBeGreaterThan(0);
    const marta = actors.find((a) => a.id === 'barkeep_marta');
    expect(marta).toBeDefined();
    expect(marta!.name).toBe('Marta Voss');
    expect(marta!.controller).toBe('agent');
  });

  it('seeds locations with prose descriptions', () => {
    loadCampaign(CAMPAIGN_DIR, db);
    const repo = createCampaignRepository(db);
    const locations = repo.listLocations();

    expect(locations.length).toBeGreaterThan(0);
    const goose = locations.find((l) => l.id === 'location_drunken_goose');
    expect(goose).toBeDefined();
    expect(goose!.type).toBe('building');
    expect(goose!.description).toContain('Drunken Goose');
  });

  it('seeds game state with campaign ID', () => {
    loadCampaign(CAMPAIGN_DIR, db);
    const row = db.prepare('SELECT * FROM game_state WHERE id = ?').get('current') as Record<string, unknown> | undefined;
    expect(row).toBeDefined();
    expect(row!['campaign_id']).toBe('test_smallest');
  });

  it('produces repair report for broken campaign', () => {
    const result = loadCampaign(BROKEN_DIR, db);

    expect(result.report.hasErrors()).toBe(true);
    const issues = result.report.getIssues();
    expect(issues.length).toBeGreaterThan(0);

    const errorIssues = issues.filter((i) => i.severity === 'error');
    expect(errorIssues.length).toBeGreaterThan(0);
  });

  it('detects ID-filename mismatch', () => {
    const result = loadCampaign(BROKEN_DIR, db);
    const issues = result.report.getIssues();

    const mismatch = issues.find((i) =>
      i.field === 'id' && i.message.includes('does not match filename'),
    );
    expect(mismatch).toBeDefined();
    expect(mismatch!.severity).toBe('warning');
  });

  it('detects missing required fields', () => {
    const result = loadCampaign(BROKEN_DIR, db);
    const issues = result.report.getIssues();

    const missingType = issues.find((i) =>
      i.file.includes('missing_fields') && i.severity === 'error',
    );
    expect(missingType).toBeDefined();
  });

  it('validates cross-references and catches dangling refs', () => {
    const result = loadCampaign(BROKEN_DIR, db);
    const issues = result.report.getIssues();

    const danglingRef = issues.find((i) =>
      i.message.includes('does not exist'),
    );
    expect(danglingRef).toBeDefined();
  });

  it('does not seed database when errors exist', () => {
    loadCampaign(BROKEN_DIR, db);
    const actors = db.prepare('SELECT COUNT(*) as cnt FROM actors').get() as { cnt: number };
    expect(actors.cnt).toBe(0);
  });

  it('formats repair report as human-readable string', () => {
    const result = loadCampaign(BROKEN_DIR, db);
    const formatted = result.report.format();

    expect(formatted).toContain('error');
    expect(formatted).toContain('Campaign Repair Report');
  });

  it('round-trips actor data through repository with correct branded types', () => {
    loadCampaign(CAMPAIGN_DIR, db);
    const repo = createCampaignRepository(db);

    const marta = repo.getActor('barkeep_marta' as never);
    expect(marta).toBeDefined();
    expect(marta!.name).toBe('Marta Voss');
    expect(marta!.sheet).toBeDefined();
    expect(typeof marta!.sheet.hp_current).toBe('number');
  });
});

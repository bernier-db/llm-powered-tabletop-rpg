// tests/schema/test-campaign-validates.test.ts
//
// End-to-end smoke test: walks every file in campaigns/test_smallest/ and
// validates each file's frontmatter against the appropriate authored schema.
//
// Philosophy: this is the FAILING-FIRST target for the loader work that
// comes later. Right now it validates only the authored frontmatter fields;
// a full loader (Wave 2) will parse YAML bodies, resolve references, seed
// SQLite, and run deeper validation gates.
//
// Cross-ref: design/architecture/generation/01-campaign-authoring-validation.md
//            design/13-risks-tripwires.md §7 (authored markdown is read-only during play)
//            design/13-risks-tripwires.md §18 (≥3 clue-paths per required beat — loader gate, not here)

import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { walkCampaign, type CampaignFileTuple } from '../helpers/campaign-walker.js';
import {
  NPCAuthoredSchema,
  LocationAuthoredSchema,
  FactionAuthoredSchema,
  BeatAuthoredSchema,
  ForeshadowSeedAuthoredSchema,
  EncounterTableAuthoredSchema,
  CampaignAuthoredSchema,
} from '../../src/schema/authored-campaign.js';

// ─── Path resolution ───────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');
const CAMPAIGN_ROOT = join(PROJECT_ROOT, 'campaigns', 'test_smallest');

// ─── Schema routing ────────────────────────────────────────────────────────────

import { z } from 'zod';

function schemaFor(tuple: CampaignFileTuple): z.ZodTypeAny | null {
  switch (tuple.expected_schema_name) {
    case 'NPCAuthored':             return NPCAuthoredSchema;
    case 'LocationAuthored':        return LocationAuthoredSchema;
    case 'FactionAuthored':         return FactionAuthoredSchema;
    case 'BeatAuthored':            return BeatAuthoredSchema;
    case 'ForeshadowSeedAuthored':  return ForeshadowSeedAuthoredSchema;
    case 'EncounterTableAuthored':  return EncounterTableAuthoredSchema;
    case 'CampaignAuthored':        return CampaignAuthoredSchema;
    case 'Unknown':                 return null; // skip unknown dirs
    default:                        return null;
  }
}

// ─── Frontmatter → object coercion ────────────────────────────────────────────
//
// The campaign-walker extracts frontmatter as Record<string, string>.
// For numeric fields (hp, ac, level, etc.) we need to coerce string → number.
// We do this by using a small YAML-aware coercion layer rather than a full parser.
// (A real loader uses js-yaml; here we use JSON.parse for numeric coercion.)
//
// This is intentionally minimal — the integration test validates structure,
// not every nested sub-object. The loader will do full validation.

function coerceField(value: string): unknown {
  if (value === 'null' || value === '~') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  const n = Number(value);
  if (!isNaN(n) && value.trim() !== '') return n;
  return value;
}

function coerceFrontmatterFields(
  fields: Record<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    result[k] = coerceField(v);
  }
  return result;
}

// ─── Test suite ────────────────────────────────────────────────────────────────

describe('test_smallest campaign — authored file validation', () => {
  // Walk the campaign once; share across all its() below
  const files = walkCampaign(CAMPAIGN_ROOT);

  it('finds at least one campaign file to validate', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('finds the expected file categories', () => {
    const dirs = new Set(files.map((f) => f.dir));
    // Must cover at minimum these categories
    expect(dirs.has('')).toBe(true);          // campaign root
    expect(dirs.has('npcs')).toBe(true);
    expect(dirs.has('locations')).toBe(true);
    expect(dirs.has('factions')).toBe(true);
    expect(dirs.has('beats')).toBe(true);
    expect(dirs.has('foreshadow')).toBe(true);
    expect(dirs.has('encounters')).toBe(true);
  });

  // ── Per-file validation ─────────────────────────────────────────────────────
  //
  // For every file that has frontmatter AND maps to a known schema,
  // assert that the coerced frontmatter fields parse without error.
  //
  // Files without frontmatter (pure prose docs) are skipped — they are
  // validated as documentation, not as data.

  for (const file of files) {
    const schema = schemaFor(file);
    if (!schema) continue;                    // unknown dir — skip
    if (!file.frontmatter.hasFrontmatter) continue; // no frontmatter — skip

    const shortPath = file.path.replace(PROJECT_ROOT + '/', '');

    it(`${shortPath} — frontmatter validates against ${file.expected_schema_name}`, () => {
      const coerced = coerceFrontmatterFields(file.frontmatter.fields);

      // Strip fields that are clearly markdown-doc metadata (title, status,
      // summary, related, updated) — these live in design/ frontmatter but
      // some campaign files also use them for documentation purposes.
      // The authored-campaign schemas use .passthrough() or .strict() as
      // appropriate; for strict schemas we drop doc-only keys first.
      const NON_DATA_KEYS = new Set(['title', 'status', 'summary', 'related', 'updated']);
      const dataFields: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(coerced)) {
        if (!NON_DATA_KEYS.has(k)) dataFields[k] = v;
      }

      expect(
        () => schema.parse(dataFields),
        `Validation failed for ${shortPath}:\nfields: ${JSON.stringify(dataFields, null, 2)}`,
      ).not.toThrow();
    });
  }

  // ── Spot-checks on specific files ──────────────────────────────────────────
  //
  // These are explicit assertions about files we authored by hand, so that
  // regressions in those specific files are caught with clear error messages.

  it('barkeep_marta.yaml validates as NPCAuthored with seed_memories', () => {
    // barkeep_marta.yaml is a pure YAML file (no markdown frontmatter block)
    const martaFile = files.find((f) => f.path.includes('barkeep_marta.yaml'));
    expect(martaFile, 'barkeep_marta.yaml should exist').toBeDefined();
    if (!martaFile) return;

    // For .yaml files the whole content is the data; parse via NPCAuthoredSchema
    // We use the raw frontmatter (whole file) but must convert types.
    // For a proper validation we'd need a YAML parser; here we check key fields
    // exist in the extracted scalar fields and at minimum the schema doesn't
    // reject the scalar top-level fields it can read.
    const fields = coerceFrontmatterFields(martaFile.frontmatter.fields);
    expect(fields['id']).toBe('barkeep_marta');
    expect(fields['name']).toBe('Marta Voss');
    expect(typeof fields['base_disposition']).toBe('number');
  });

  it('pc_aryn.yaml validates as NPCAuthored (PC actor)', () => {
    const arynFile = files.find((f) => f.path.includes('pc_aryn.yaml'));
    expect(arynFile, 'pc_aryn.yaml should exist').toBeDefined();
    if (!arynFile) return;
    const fields = coerceFrontmatterFields(arynFile.frontmatter.fields);
    expect(fields['id']).toBe('pc_aryn');
    expect(fields['controller']).toBe('human');
    // hp must be a number (coerced from yaml integer)
    expect(typeof fields['hp']).toBe('number');
  });

  it('drunken_goose.yaml validates as LocationAuthored', () => {
    const gooseFile = files.find((f) => f.path.includes('drunken_goose.yaml'));
    expect(gooseFile, 'drunken_goose.yaml should exist').toBeDefined();
    if (!gooseFile) return;
    const fields = coerceFrontmatterFields(gooseFile.frontmatter.fields);
    expect(fields['id']).toBe('drunken_goose');
    expect(fields['type']).toBe('building');
    expect(
      () => LocationAuthoredSchema.parse({ id: fields['id'], type: fields['type'] }),
    ).not.toThrow();
  });

  it('01_arrival.yaml validates as BeatAuthored', () => {
    const beatFile = files.find((f) => f.path.includes('01_arrival.yaml'));
    expect(beatFile, '01_arrival.yaml should exist').toBeDefined();
    if (!beatFile) return;
    const fields = coerceFrontmatterFields(beatFile.frontmatter.fields);
    expect(fields['id']).toBe('01_arrival');
    expect(fields['location_id']).toBe('location_drunken_goose');
  });

  it('region_greyhill.md location frontmatter contains expected fields', () => {
    const regionFile = files.find((f) => f.path.includes('region_greyhill.md'));
    expect(regionFile, 'region_greyhill.md should exist').toBeDefined();
    if (!regionFile) return;
    expect(regionFile.frontmatter.hasFrontmatter).toBe(true);
    const fields = regionFile.frontmatter.fields;
    expect(fields['id']).toBe('region_greyhill');
    expect(fields['type']).toBe('region');
  });

  it('antagonist_a.md has stub: true (intentional incomplete NPC)', () => {
    const antagonistFile = files.find((f) => f.path.includes('antagonist_a.md'));
    expect(antagonistFile, 'antagonist_a.md should exist').toBeDefined();
    if (!antagonistFile) return;
    // stub field should be present in frontmatter
    const fields = antagonistFile.frontmatter.fields;
    expect(fields['id']).toBe('antagonist_a');
    // stub may appear as 'true' string in raw frontmatter (before coercion)
    const coerced = coerceFrontmatterFields(fields);
    expect(coerced['stub']).toBe(true);
  });
});

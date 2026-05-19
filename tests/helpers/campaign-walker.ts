// tests/helpers/campaign-walker.ts
//
// Walks every file in a campaigns/<name>/ directory and yields tuples of:
//   { path, content, frontmatter, dir, expected_schema_name }
//
// "expected_schema_name" is derived from the subdirectory the file lives in:
//   npcs/      → 'NPCAuthored'   (actor-flavored authored shape)
//   locations/ → 'Location'
//   factions/  → 'Faction'       (authored frontmatter shape)
//   beats/     → 'Beat'
//   foreshadow/ → 'ForeshadowSeed'
//   encounters/ → 'EncounterTable'
//   (root)     → 'Campaign'
//
// This file is test infrastructure only — not production code.
// Cross-ref: spec/architecture/generation/01-campaign-authoring-validation.md

import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, basename, extname, dirname } from 'path';

// ─── Frontmatter extraction ────────────────────────────────────────────────────
//
// Supports two formats:
//   1. YAML frontmatter in markdown (---\n...\n---)
//   2. Plain YAML files (.yaml / .yml) — the entire file is frontmatter
//
// We intentionally avoid a full YAML parser dependency here (none is installed);
// we extract the raw frontmatter string and do minimal key:value parsing
// sufficient for schema routing decisions. A real loader would use `js-yaml`.

export interface FrontmatterResult {
  /** Raw frontmatter block (YAML text) */
  raw: string;
  /** Key→value pairs extracted from the frontmatter (string values only) */
  fields: Record<string, string>;
  /** True if the file had a YAML frontmatter block; false for plain-content files */
  hasFrontmatter: boolean;
}

function extractFrontmatter(content: string, isYaml: boolean): FrontmatterResult {
  if (isYaml) {
    // Whole file is YAML; treat as frontmatter
    return { raw: content, fields: parseYamlFields(content), hasFrontmatter: true };
  }
  // Markdown: look for ---\n...\n--- at the top
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match || !match[1]) {
    return { raw: '', fields: {}, hasFrontmatter: false };
  }
  return { raw: match[1], fields: parseYamlFields(match[1]), hasFrontmatter: true };
}

/**
 * Minimal key:value YAML parser. Handles:
 *   key: value
 *   key: "value with spaces"
 * Does NOT handle nested objects, lists, or multi-line values.
 * That is intentional — we only need the top-level scalar fields for routing.
 */
function parseYamlFields(yaml: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of yaml.split('\n')) {
    const match = line.match(/^(\w[\w_-]*):\s*(.*)$/);
    if (!match) continue;
    const key = match[1] ?? '';
    let value = (match[2] ?? '').trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

// ─── Schema routing ────────────────────────────────────────────────────────────

export type ExpectedSchemaName =
  | 'NPCAuthored'
  | 'LocationAuthored'
  | 'FactionAuthored'
  | 'BeatAuthored'
  | 'ForeshadowSeedAuthored'
  | 'EncounterTableAuthored'
  | 'CampaignAuthored'
  | 'Unknown';

function schemaNameForDir(subdir: string): ExpectedSchemaName {
  switch (subdir) {
    case 'npcs':        return 'NPCAuthored';
    case 'locations':   return 'LocationAuthored';
    case 'factions':    return 'FactionAuthored';
    case 'beats':       return 'BeatAuthored';
    case 'foreshadow':  return 'ForeshadowSeedAuthored';
    case 'encounters':  return 'EncounterTableAuthored';
    case '':            return 'CampaignAuthored'; // root level
    default:            return 'Unknown';
  }
}

// ─── Campaign file tuple ───────────────────────────────────────────────────────

export interface CampaignFileTuple {
  /** Absolute path to the file */
  path: string;
  /** File content as a string */
  content: string;
  /** Extracted frontmatter */
  frontmatter: FrontmatterResult;
  /** The subdirectory relative to the campaign root (e.g. 'npcs', 'locations', '') */
  dir: string;
  /** Which schema should validate this file */
  expected_schema_name: ExpectedSchemaName;
}

// ─── Walker ───────────────────────────────────────────────────────────────────

/**
 * Walk every .md and .yaml/.yml file in the campaign directory.
 * Returns an array of CampaignFileTuple, one per file.
 */
export function walkCampaign(campaignRoot: string): CampaignFileTuple[] {
  const results: CampaignFileTuple[] = [];
  collectFiles(campaignRoot, campaignRoot, results);
  return results;
}

function collectFiles(root: string, dir: string, out: CampaignFileTuple[]): void {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      collectFiles(root, fullPath, out);
    } else {
      const ext = extname(entry).toLowerCase();
      if (ext !== '.md' && ext !== '.yaml' && ext !== '.yml') continue;
      const content = readFileSync(fullPath, 'utf8');
      const isYaml = ext === '.yaml' || ext === '.yml';
      const frontmatter = extractFrontmatter(content, isYaml);
      // Subdirectory relative to campaign root (e.g. 'npcs', 'locations', '')
      const relativeDir = relative(root, dirname(fullPath));
      const subdir = relativeDir === '.' ? '' : relativeDir.split('/')[0] ?? '';
      out.push({
        path: fullPath,
        content,
        frontmatter,
        dir: subdir,
        expected_schema_name: schemaNameForDir(subdir),
      });
    }
  }
}

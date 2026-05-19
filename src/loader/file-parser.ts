import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import yaml from 'js-yaml';

export interface ParsedFile {
  data: Record<string, unknown>;
  prose: string;
}

const FRONTMATTER_KEYS = new Set([
  'title', 'status', 'summary', 'related', 'updated',
]);

export function parseFile(filePath: string): ParsedFile {
  const content = readFileSync(filePath, 'utf8');
  const ext = extname(filePath).toLowerCase();

  if (ext === '.yaml' || ext === '.yml') {
    return parseYaml(content);
  }
  return parseMarkdown(content);
}

function stripNulls(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null) {
      result[key] = value;
    }
  }
  return result;
}

function parseYaml(content: string): ParsedFile {
  const data = yaml.load(content);
  if (data === null || data === undefined || typeof data !== 'object') {
    return { data: {}, prose: '' };
  }
  return { data: stripNulls(data as Record<string, unknown>), prose: '' };
}

function parseMarkdown(content: string): ParsedFile {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, prose: content };
  }

  const frontmatterRaw = match[1] ?? '';
  const prose = (match[2] ?? '').trim();

  const parsed = yaml.load(frontmatterRaw);
  if (parsed === null || parsed === undefined || typeof parsed !== 'object') {
    return { data: {}, prose };
  }

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!FRONTMATTER_KEYS.has(key) && value !== null) {
      data[key] = value;
    }
  }

  return { data, prose };
}

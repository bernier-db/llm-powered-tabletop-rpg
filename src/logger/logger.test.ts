import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { rmSync } from 'node:fs';

let tmpDir: string;

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'logger-test-'));
  vi.resetModules();
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

async function freshLogger(opts?: {
  filePath?: string;
  level?: string;
  pretty?: boolean;
}) {
  const mod = await import('./logger.js');
  mod.configure({
    filePath: opts?.filePath ?? join(tmpDir, 'test.log'),
    level: opts?.level as 'debug' | 'info' | 'warn' | 'error' | undefined,
    pretty: opts?.pretty ?? false,
  });
  mod.setTraceId(undefined);
  return mod;
}

describe('JSON output format', () => {
  it('writes valid JSON lines with required fields', async () => {
    const { createLogger } = await freshLogger();
    const log = createLogger('test-component');

    log.info('hello world');

    const content = readFileSync(join(tmpDir, 'test.log'), 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(1);

    const entry = JSON.parse(lines[0]!);
    expect(entry.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(entry.level).toBe('info');
    expect(entry.component).toBe('test-component');
    expect(entry.msg).toBe('hello world');
    expect(entry.trace_id).toBeUndefined();
    expect(entry.data).toBeUndefined();
  });

  it('includes data when provided', async () => {
    const { createLogger } = await freshLogger();
    const log = createLogger('db');

    log.warn('slow query', { duration_ms: 500 });

    const content = readFileSync(join(tmpDir, 'test.log'), 'utf-8');
    const entry = JSON.parse(content.trim());
    expect(entry.data).toEqual({ duration_ms: 500 });
  });
});

describe('trace_id propagation', () => {
  it('includes trace_id when set', async () => {
    const { createLogger, setTraceId } = await freshLogger();
    setTraceId('abc-123');
    const log = createLogger('engine');

    log.info('processing');

    const content = readFileSync(join(tmpDir, 'test.log'), 'utf-8');
    const entry = JSON.parse(content.trim());
    expect(entry.trace_id).toBe('abc-123');
  });

  it('omits trace_id when not set', async () => {
    const { createLogger } = await freshLogger();
    const log = createLogger('engine');

    log.info('processing');

    const content = readFileSync(join(tmpDir, 'test.log'), 'utf-8');
    const entry = JSON.parse(content.trim());
    expect(entry).not.toHaveProperty('trace_id');
  });
});

describe('log level filtering', () => {
  it('filters messages below minimum level', async () => {
    const { createLogger } = await freshLogger({ level: 'warn' });
    const log = createLogger('filtered');

    log.debug('should not appear');
    log.info('should not appear');
    log.warn('should appear');
    log.error('should appear');

    const content = readFileSync(join(tmpDir, 'test.log'), 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!).level).toBe('warn');
    expect(JSON.parse(lines[1]!).level).toBe('error');
  });
});

describe('file rotation', () => {
  it('rotates when file exceeds 10MB', async () => {
    const logPath = join(tmpDir, 'rotate.log');
    const { createLogger } = await freshLogger({ filePath: logPath });
    const log = createLogger('rotation');

    const bigChunk = 'x'.repeat(1024);
    writeFileSync(logPath, bigChunk.repeat(10 * 1024), 'utf-8');

    log.info('after rotation');

    expect(existsSync(`${logPath}.1`)).toBe(true);
    const current = readFileSync(logPath, 'utf-8');
    expect(current).toContain('after rotation');
  });
});

describe('pretty console mode', () => {
  it('writes to stderr when pretty mode is enabled', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const { createLogger } = await freshLogger({ pretty: true });
    const log = createLogger('pretty');

    log.info('colorful message');

    expect(stderrSpy).toHaveBeenCalled();
    const output = stderrSpy.mock.calls[0]![0] as string;
    expect(output).toContain('[pretty]');
    expect(output).toContain('colorful message');
    stderrSpy.mockRestore();
  });
});

describe('all log levels emit', () => {
  it('writes debug, info, warn, error entries', async () => {
    const { createLogger } = await freshLogger();
    const log = createLogger('all-levels');

    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');

    const content = readFileSync(join(tmpDir, 'test.log'), 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(4);
    expect(JSON.parse(lines[0]!).level).toBe('debug');
    expect(JSON.parse(lines[1]!).level).toBe('info');
    expect(JSON.parse(lines[2]!).level).toBe('warn');
    expect(JSON.parse(lines[3]!).level).toBe('error');
  });
});

import { writeToFile } from './file-transport.js';
import { writePretty } from './pretty-transport.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  ts: string;
  level: LogLevel;
  component: string;
  trace_id?: string;
  msg: string;
  data?: Record<string, unknown>;
}

export interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0, info: 1, warn: 2, error: 3,
};

let currentTraceId: string | undefined;
let logFilePath: string | undefined;
let minLevel: LogLevel = 'debug';
let prettyMode = false;

export function setTraceId(id: string | undefined): void {
  currentTraceId = id;
}

export function getTraceId(): string | undefined {
  return currentTraceId;
}

export function configure(opts?: {
  filePath?: string;
  level?: LogLevel;
  pretty?: boolean;
}): void {
  logFilePath = opts?.filePath ?? process.env['LOG_FILE'] ?? 'logs/engine.log';
  minLevel = opts?.level ?? (process.env['LOG_LEVEL'] as LogLevel | undefined) ?? 'debug';
  prettyMode = opts?.pretty ?? process.env['LOG_FORMAT'] === 'pretty';
}

function emit(
  level: LogLevel,
  component: string,
  msg: string,
  data?: Record<string, unknown>,
): void {
  if (LEVEL_RANK[level] < LEVEL_RANK[minLevel]) return;

  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    component,
    ...(currentTraceId ? { trace_id: currentTraceId } : {}),
    msg,
    ...(data ? { data } : {}),
  };

  const filePath = logFilePath ?? 'logs/engine.log';
  writeToFile(filePath, JSON.stringify(entry));

  if (prettyMode) writePretty(level, component, msg);
}

export function createLogger(component: string): Logger {
  if (!logFilePath) configure();
  return {
    debug: (msg, data) => emit('debug', component, msg, data),
    info:  (msg, data) => emit('info',  component, msg, data),
    warn:  (msg, data) => emit('warn',  component, msg, data),
    error: (msg, data) => emit('error', component, msg, data),
  };
}

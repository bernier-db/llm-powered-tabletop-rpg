const RESET = '\x1b[0m';

const LEVEL_COLORS: Record<string, string> = {
  debug: '\x1b[90m',   // gray
  info:  '\x1b[36m',   // cyan
  warn:  '\x1b[33m',   // yellow
  error: '\x1b[31m',   // red
};

export function formatPretty(
  level: string,
  component: string,
  msg: string,
): string {
  const color = LEVEL_COLORS[level] ?? RESET;
  const ts = new Date().toISOString();
  const tag = level.toUpperCase().padEnd(5);
  return `${color}${tag}${RESET} ${ts} [${component}] ${msg}`;
}

export function writePretty(
  level: string,
  component: string,
  msg: string,
): void {
  process.stderr.write(formatPretty(level, component, msg) + '\n');
}

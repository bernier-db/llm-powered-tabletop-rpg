import {
  appendFileSync,
  statSync,
  renameSync,
  unlinkSync,
  mkdirSync,
  existsSync,
} from 'node:fs';
import { dirname } from 'node:path';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_ROTATED = 3;

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function rotate(basePath: string): void {
  for (let i = MAX_ROTATED; i >= 1; i--) {
    const src = i === 1 ? basePath : `${basePath}.${i - 1}`;
    const dst = `${basePath}.${i}`;
    try {
      if (i === MAX_ROTATED) unlinkSync(dst);
    } catch { /* no-op if missing */ }
    try { renameSync(src, dst); } catch { /* no-op */ }
  }
}

function needsRotation(filePath: string): boolean {
  try {
    return statSync(filePath).size >= MAX_BYTES;
  } catch {
    return false;
  }
}

export function writeToFile(
  filePath: string,
  line: string,
): void {
  ensureDir(filePath);
  if (needsRotation(filePath)) rotate(filePath);
  appendFileSync(filePath, line + '\n', 'utf-8');
}

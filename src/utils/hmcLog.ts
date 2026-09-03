import {appendFileSync, existsSync, readFileSync} from 'node:fs';
import path from 'node:path';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function logTaskToHmc(cwd: string, target: string): string {
  const filePath = path.join(cwd, 'PXH_HMC.md');
  const now = new Date();
  const newFile = !existsSync(filePath);
  const prefix = newFile
    ? '# PXH_HMC.md - Change Log\n'
    : existsSync(filePath) && !needsNewline(filePath)
      ? '\n'
      : '';
  const entry =
    `\n## ${formatDate(now)}\n\n### Task hoàn thành\n\n` +
    `- Lúc: ${formatTime(now)}\n` +
    `- TARGET: ${target.trim()}\n`;
  appendFileSync(filePath, `${prefix}${entry}`, 'utf8');
  return filePath;
}

function needsNewline(filePath: string): boolean {
  try {
    const content = readFileSync(filePath, 'utf8');
    return content.length === 0 || content.endsWith('\n');
  } catch {
    return true;
  }
}

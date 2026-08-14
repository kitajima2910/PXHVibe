const pastedBlockPattern = /\[PASTED BLOCK \d+\]\r?\n([\s\S]*?)(?=\n\n\[PASTED BLOCK \d+\]\r?\n|$)/g;

export function countTextLines(value: string): number {
  return value.length === 0 ? 0 : value.split(/\r?\n/).length;
}

export function countDisplayLines(value: string, lineWidth: number): number {
  if (value.length === 0) return 0;
  const width = Math.max(1, lineWidth);
  return value.split(/\r?\n/).reduce((total, line) =>
    total + Math.max(1, Math.ceil(Array.from(line).length / width)), 0);
}

/** Preserve the editable prompt, but collapse immutable pasted payloads for TUI display. */
export function collapsePastedBlocksForDisplay(value: string, lineWidth = 80): string {
  return value.replace(pastedBlockPattern, (_match, block: string) => `~${countDisplayLines(block, lineWidth)} dòng`);
}

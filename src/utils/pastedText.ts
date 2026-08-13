const pastedBlockPattern = /\[PASTED BLOCK \d+\]\r?\n([\s\S]*?)(?=\n\n\[PASTED BLOCK \d+\]\r?\n|$)/g;

export function countTextLines(value: string): number {
  return value.length === 0 ? 0 : value.split(/\r?\n/).length;
}

/** Preserve the editable prompt, but collapse immutable pasted payloads for TUI display. */
export function collapsePastedBlocksForDisplay(value: string): string {
  return value.replace(pastedBlockPattern, (_match, block: string) => `~ ${countTextLines(block)} lines`);
}

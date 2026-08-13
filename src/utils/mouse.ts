export interface TerminalMouseEvent {
  button: 'left' | 'wheel-up' | 'wheel-down' | 'other';
  action: 'press' | 'release' | 'move';
  /** Zero-based terminal column. */
  x: number;
  /** Zero-based terminal row. */
  y: number;
}

export function parseTerminalMouse(input: string): TerminalMouseEvent | undefined {
  const match = input.match(/^\[?<([0-9]+);([0-9]+);([0-9]+)([Mm])$/);
  if (match === null) return undefined;
  const code = Number(match[1]);
  const x = Number(match[2]) - 1;
  const y = Number(match[3]) - 1;
  if (!Number.isFinite(code) || !Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  if ((code & 64) !== 0) {
    return {button: (code & 1) === 0 ? 'wheel-up' : 'wheel-down', action: 'press', x, y};
  }
  return {
    button: (code & 3) === 0 ? 'left' : 'other',
    action: match[4] === 'm' ? 'release' : ((code & 32) !== 0 ? 'move' : 'press'),
    x,
    y,
  };
}

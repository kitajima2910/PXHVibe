export interface TerminalTitleOutput {
  isTTY?: boolean;
  write(value: string): unknown;
}

export function setTerminalTitle(
  title: string,
  output: TerminalTitleOutput = process.stdout,
): void {
  process.title = title;
  if (output.isTTY === true) output.write(`\u001B]0;${sanitizeTitle(title)}\u0007`);
}

export interface TerminalScreen {
  restore(): void;
}

export function enterTerminalScreen(output: TerminalTitleOutput = process.stdout): TerminalScreen {
  if (output.isTTY !== true) return {restore() {}};
  output.write('\u001B[?1049h\u001B[2J\u001B[H');
  let active = true;
  const restore = (): void => {
    if (!active) return;
    active = false;
    output.write('\u001B[?1049l');
    process.off('exit', restore);
  };
  process.once('exit', restore);
  return {restore};
}

function sanitizeTitle(title: string): string {
  return title.replace(/[\u0000-\u001F\u007F]/g, '').slice(0, 80);
}

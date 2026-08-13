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

function sanitizeTitle(title: string): string {
  return title.replace(/[\u0000-\u001F\u007F]/g, '').slice(0, 80);
}

export type TerminalBlock =
  | {type: 'blank'}
  | {type: 'code'; content: string; language: string}
  | {type: 'heading'; content: string; level: number}
  | {type: 'bullet'; content: string}
  | {type: 'numbered'; content: string; marker: string}
  | {type: 'quote'; content: string}
  | {type: 'text'; content: string};

export function parseTerminalBlocks(content: string): TerminalBlock[] {
  const blocks: TerminalBlock[] = [];
  let codeLanguage = '';
  let codeLines: string[] | undefined;

  for (const line of content.replace(/\r\n/g, '\n').split('\n')) {
    const fence = line.match(/^```\s*([^\s`]*)/);
    if (fence !== null) {
      if (codeLines === undefined) {
        codeLanguage = fence[1] ?? '';
        codeLines = [];
      } else {
        blocks.push({type: 'code', content: codeLines.join('\n'), language: codeLanguage});
        codeLanguage = '';
        codeLines = undefined;
      }
      continue;
    }
    if (codeLines !== undefined) {
      codeLines.push(line);
      continue;
    }
    if (line.trim().length === 0) {
      blocks.push({type: 'blank'});
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading !== null) {
      blocks.push({type: 'heading', level: heading[1]!.length, content: heading[2]!});
      continue;
    }
    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    if (bullet !== null) {
      blocks.push({type: 'bullet', content: bullet[1]!});
      continue;
    }
    const numbered = line.match(/^\s*(\d+[.)])\s+(.+)$/);
    if (numbered !== null) {
      blocks.push({type: 'numbered', marker: numbered[1]!, content: numbered[2]!});
      continue;
    }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote !== null) {
      blocks.push({type: 'quote', content: quote[1]!});
      continue;
    }
    blocks.push({type: 'text', content: line});
  }

  if (codeLines !== undefined) {
    blocks.push({type: 'code', content: codeLines.join('\n'), language: codeLanguage});
  }
  return trimBlankBlocks(blocks);
}

function trimBlankBlocks(blocks: TerminalBlock[]): TerminalBlock[] {
  while (blocks[0]?.type === 'blank') blocks.shift();
  while (blocks.at(-1)?.type === 'blank') blocks.pop();
  return blocks;
}

import React from 'react';
import {Box, Text} from 'ink';

interface DiffViewProps { content: string; maxLines?: number; }
interface DiffLine {
  kind: 'file' | 'hunk' | 'meta' | 'add' | 'remove' | 'context';
  text: string;
  oldLine?: number | undefined;
  newLine?: number | undefined;
}

const github = {
  border: '#30363d', muted: '#8b949e', text: '#c9d1d9', blue: '#58a6ff',
  green: '#3fb950', greenBg: '#12261e', red: '#f85149', redBg: '#2d1619', hunkBg: '#1b2736',
} as const;

/** Render unified diff as a compact GitHub Dark-style file patch. */
export function DiffView({content, maxLines = 200}: DiffViewProps): React.JSX.Element {
  const lines = parseDiff(content);
  const visible = lines.slice(0, Math.max(1, maxLines));
  const truncated = lines.length - visible.length;
  const additions = lines.filter((line) => line.kind === 'add').length;
  const deletions = lines.filter((line) => line.kind === 'remove').length;

  return (
    <Box flexDirection="column" marginY={1} flexShrink={0}>
      <Box justifyContent="space-between">
        <Box gap={1}>
          <Text bold color={github.text}>Files changed</Text>
          <Text color={github.muted}>{fileCount(lines)}</Text>
        </Box>
        <Box gap={1}>
          <Text bold color={github.green}>+{additions}</Text>
          <Text bold color={github.red}>−{deletions}</Text>
        </Box>
      </Box>
      <Text color={github.border}>────────────────────────────────────────</Text>
      {visible.map((line, index) => <DiffLineView key={index} line={line} />)}
      {truncated > 0 && <Text color={github.muted}>… còn {truncated} dòng</Text>}
    </Box>
  );
}

export function parseDiff(content: string): DiffLine[] {
  const lines: DiffLine[] = [];
  let oldLine: number | undefined;
  let newLine: number | undefined;
  for (const raw of content.replace(/\r\n/g, '\n').split('\n')) {
    if (raw.startsWith('diff --git ') || raw.startsWith('new file') || raw.startsWith('deleted file')) {
      lines.push({kind: 'file', text: raw}); continue;
    }
    if (raw.startsWith('index ') || raw.startsWith('+++ ') || raw.startsWith('--- ')) {
      lines.push({kind: 'meta', text: raw}); continue;
    }
    if (raw.startsWith('@@ ')) {
      const range = raw.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      oldLine = range === null ? undefined : Number(range[1]);
      newLine = range === null ? undefined : Number(range[2]);
      lines.push({kind: 'hunk', text: raw}); continue;
    }
    if (raw.startsWith('+')) {
      lines.push({kind: 'add', text: raw, newLine});
      if (newLine !== undefined) newLine += 1;
      continue;
    }
    if (raw.startsWith('-')) {
      lines.push({kind: 'remove', text: raw, oldLine});
      if (oldLine !== undefined) oldLine += 1;
      continue;
    }
    lines.push({kind: 'context', text: raw, oldLine, newLine});
    if (oldLine !== undefined) oldLine += 1;
    if (newLine !== undefined) newLine += 1;
  }
  return lines;
}

function DiffLineView({line}: {line: DiffLine}): React.JSX.Element {
  if (line.kind === 'file') {
    return <Box marginTop={1} gap={1}><Text bold color={github.blue}>▾</Text><Text bold color={github.text}>{extractFileName(line.text)}</Text></Box>;
  }
  if (line.kind === 'hunk') {
    return <Text color={github.blue} backgroundColor={github.hunkBg}>{'     ·     │ '}{line.text}</Text>;
  }
  if (line.kind === 'meta') return <Text color={github.muted}>{`           │ ${line.text}`}</Text>;

  const marker = line.kind === 'add' ? '+' : line.kind === 'remove' ? '−' : ' ';
  const foreground = line.kind === 'add' ? github.green : line.kind === 'remove' ? github.red : github.text;
  const background = line.kind === 'add' ? github.greenBg : line.kind === 'remove' ? github.redBg : undefined;
  const code = line.kind === 'add' || line.kind === 'remove' ? line.text.slice(1) : line.text.startsWith(' ') ? line.text.slice(1) : line.text;
  return (
    <Text color={foreground} {...(background === undefined ? {} : {backgroundColor: background})}>
      {lineNumber(line.oldLine)} {lineNumber(line.newLine)} │ {marker} {code}
    </Text>
  );
}

function lineNumber(value: number | undefined): string {
  return value === undefined ? '   ' : String(value).padStart(3, ' ');
}

function extractFileName(line: string): string {
  const match = line.match(/^diff --git a\/.+? b\/(.+)$/);
  return match?.[1] ?? line.replace(/^(?:new|deleted) file mode /, 'mode ');
}

function fileCount(lines: readonly DiffLine[]): string {
  const count = lines.filter((line) => line.kind === 'file' && line.text.startsWith('diff --git ')).length;
  return `${count} file${count === 1 ? '' : 's'}`;
}

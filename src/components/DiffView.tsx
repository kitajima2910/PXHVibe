import React from 'react';
import {Box, Text} from 'ink';

interface DiffViewProps {
  content: string;
  maxLines?: number;
}

interface DiffLine {
  kind: 'file' | 'hunk' | 'meta' | 'add' | 'remove' | 'context';
  text: string;
}

/**
 * Render một unified diff (đầu ra của `git diff`) theo phong cách git:
 * header file trắng đậm, hunk header cyan, dòng + nền xanh, dòng - nền đỏ.
 */
export function DiffView({content, maxLines = 200}: DiffViewProps): React.JSX.Element {
  const lines = parseDiff(content);
  const visible = lines.slice(0, Math.max(1, maxLines));
  const truncated = lines.length - visible.length;

  return (
    <Box flexDirection="column" marginY={1} flexShrink={0}>
      <Text bold color="green">DIFF</Text>
      {visible.map((line, index) => (
        <DiffLineView key={index} line={line} />
      ))}
      {truncated > 0 && <Text dimColor>… còn {truncated} dòng</Text>}
    </Box>
  );
}

export function parseDiff(content: string): DiffLine[] {
  const lines: DiffLine[] = [];
  for (const raw of content.replace(/\r\n/g, '\n').split('\n')) {
    if (raw.startsWith('diff --git ') || raw.startsWith('new file') || raw.startsWith('deleted file')) {
      lines.push({kind: 'file', text: raw});
      continue;
    }
    if (raw.startsWith('index ')) {
      lines.push({kind: 'meta', text: raw});
      continue;
    }
    if (raw.startsWith('@@ ')) {
      lines.push({kind: 'hunk', text: raw});
      continue;
    }
    if (raw.startsWith('+++ ') || raw.startsWith('--- ')) {
      lines.push({kind: 'meta', text: raw});
      continue;
    }
    if (raw.startsWith('+')) {
      lines.push({kind: 'add', text: raw});
      continue;
    }
    if (raw.startsWith('-')) {
      lines.push({kind: 'remove', text: raw});
      continue;
    }
    lines.push({kind: 'context', text: raw});
  }
  return lines;
}

function DiffLineView({line}: {line: DiffLine}): React.JSX.Element {
  if (line.kind === 'file') {
    const label = extractFileName(line.text);
    return <Text bold color="white">📄 {label}</Text>;
  }
  if (line.kind === 'hunk') {
    return <Text color="cyan">{line.text}</Text>;
  }
  if (line.kind === 'meta') {
    return <Text dimColor>{line.text}</Text>;
  }
  if (line.kind === 'add') {
    return <Text color="green" inverse>{line.text}</Text>;
  }
  if (line.kind === 'remove') {
    return <Text color="red" inverse>{line.text}</Text>;
  }
  return <Text color="gray">{line.text}</Text>;
}

function extractFileName(line: string): string {
  const match = line.match(/^diff --git a\/(.+?) b\//);
  return match?.[1] ?? line;
}

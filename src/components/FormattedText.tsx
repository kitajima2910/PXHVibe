import React from 'react';
import {Box, Text} from 'ink';
import {parseTerminalBlocks, type TerminalBlock} from '../utils/terminalFormat.js';

interface FormattedTextProps {
  content: string;
  accent?: 'green' | 'yellow' | 'magenta' | 'cyan';
}

export function FormattedText({content, accent = 'green'}: FormattedTextProps): React.JSX.Element {
  return <FormattedBlocks blocks={parseTerminalBlocks(content)} accent={accent} />;
}

interface FormattedBlocksProps {
  blocks: readonly TerminalBlock[];
  accent?: 'green' | 'yellow' | 'magenta' | 'cyan';
}

export function FormattedBlocks({blocks, accent = 'green'}: FormattedBlocksProps): React.JSX.Element {
  return (
    <Box flexDirection="column">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === 'blank') return <Text key={key}> </Text>;
        if (block.type === 'code') {
          return (
            <Box key={key} flexDirection="column" borderStyle="single" borderColor="#484f58" paddingX={1} marginY={1}>
              {block.language && <Text color="gray" dimColor>{block.language}</Text>}
              <Text color="white">{block.content || ' '}</Text>
            </Box>
          );
        }
        if (block.type === 'heading') {
          return <Text key={key} bold color={accent}>{block.content}</Text>;
        }
        if (block.type === 'bullet') {
          return <Text key={key}><Text color={accent}>•</Text>{' '}<InlineText content={block.content} /></Text>;
        }
        if (block.type === 'numbered') {
          return <Text key={key}><Text bold color={accent}>{block.marker}</Text>{' '}<InlineText content={block.content} /></Text>;
        }
        if (block.type === 'quote') {
          return <Text key={key} italic dimColor><Text color={accent}>│</Text>{' '}{block.content}</Text>;
        }
        return <Text key={key}><InlineText content={block.content} /></Text>;
      })}
    </Box>
  );
}

function InlineText({content}: {content: string}): React.JSX.Element {
  const parts = content.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text>
      {parts.map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return <Text key={index} color="magenta">{part.slice(1, -1)}</Text>;
        }
        if (part.startsWith('**') && part.endsWith('**')) {
          return <Text key={index} bold>{part.slice(2, -2)}</Text>;
        }
        return part;
      })}
    </Text>
  );
}

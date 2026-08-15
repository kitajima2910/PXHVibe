import React from 'react';
import {Box, Text} from 'ink';

interface HeaderProps {
  workingDirectory: string;
  providerName: string;
  agentLabel: string;
  status: 'Ready' | 'Thinking...' | 'Error';
  contextPercent: number;
  contextCompacted: boolean;
}

const statusLabel: Record<HeaderProps['status'], {label: string; color: 'green' | 'yellow' | 'red'}> = {
  Ready: {label: '● READY', color: 'green'},
  'Thinking...': {label: '◐ WORKING', color: 'yellow'},
  Error: {label: '✖ ERROR', color: 'red'},
};

export function Header({workingDirectory, providerName, agentLabel, status, contextPercent, contextCompacted}: HeaderProps): React.JSX.Element {
  const statusMeta = statusLabel[status];
  const contextColor = contextPercent >= 90 ? 'yellow' : 'gray';
  return (
    <Box
      borderStyle="round"
      borderColor={statusMeta.color}
      paddingX={1}
      justifyContent="space-between"
      minHeight={1}
    >
      <Box gap={1} flexShrink={0}>
        <Text bold color={statusMeta.color}>{statusMeta.label}</Text>
        <Text color="gray">|</Text>
        <Text bold>{providerName}</Text>
      </Box>
      <Box flexShrink={0}>
        <Text color="gray">Agent · </Text>
        <Text bold color="cyan">{agentLabel}</Text>
      </Box>
      <Box gap={1} flexShrink={0}>
        <Text color={contextColor}>CTX {contextPercent}%{contextCompacted ? ' ↻' : ''}</Text>
        <Text color="gray">{workingDirectory}</Text>
      </Box>
    </Box>
  );
}

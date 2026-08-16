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

const statusLabel: Record<HeaderProps['status'], {label: string; color: 'green' | 'yellow' | 'red'; icon: string}> = {
  Ready: {label: 'READY', color: 'green', icon: '●'},
  'Thinking...': {label: 'WORKING', color: 'yellow', icon: '◆'},
  Error: {label: 'ERROR', color: 'red', icon: '✖'},
};

export function Header({workingDirectory, providerName, agentLabel, status, contextPercent, contextCompacted}: HeaderProps): React.JSX.Element {
  const statusMeta = statusLabel[status];
  const contextColor = contextPercent >= 90 ? 'red' : contextPercent >= 70 ? 'yellow' : 'green';
  const contextBar = renderContextBar(contextPercent);
  return (
    <Box
      borderStyle="round"
      borderColor={statusMeta.color}
      paddingX={1}
      justifyContent="space-between"
      minHeight={1}
    >
      <Box gap={1} flexShrink={0}>
        <Text bold color={statusMeta.color}>{statusMeta.icon} {statusMeta.label}</Text>
        <Text dimColor>│</Text>
        <Text bold color="white">{providerName}</Text>
      </Box>
      <Box flexShrink={0}>
        <Text dimColor>Agent:</Text>
        <Text bold color="cyan"> {agentLabel}</Text>
      </Box>
      <Box gap={1} flexShrink={0}>
        <Text color={contextColor}>{contextBar} {contextPercent}%{contextCompacted ? ' ↻' : ''}</Text>
        <Text dimColor>│</Text>
        <Text dimColor>{workingDirectory}</Text>
      </Box>
    </Box>
  );
}

function renderContextBar(percent: number): string {
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

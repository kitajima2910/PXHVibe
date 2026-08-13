import React from 'react';
import {Box, Text} from 'ink';

interface HeaderProps {
  workingDirectory: string;
  providerName: string;
  agentLabel: string;
  status: 'Ready' | 'Thinking...' | 'Error';
}

export function Header({workingDirectory, providerName, agentLabel, status}: HeaderProps): React.JSX.Element {
  const statusColor = status === 'Error' ? 'red' : status === 'Thinking...' ? 'yellow' : 'green';
  return (
    <Box borderStyle="round" borderColor="gray" paddingX={1} justifyContent="space-between">
      <Box gap={1}>
        <Text bold color={statusColor}>● {status === 'Thinking...' ? 'WORKING' : status.toUpperCase()}</Text>
        <Text dimColor>·</Text>
        <Text color="cyan">{providerName}</Text>
      </Box>
      <Text><Text dimColor>BUILD </Text><Text bold color="green">{agentLabel}</Text></Text>
      <Text color="gray">{workingDirectory}</Text>
    </Box>
  );
}

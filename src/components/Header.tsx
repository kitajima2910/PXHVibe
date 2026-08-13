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
    <Box borderStyle="single" borderColor="green" paddingX={1} justifyContent="space-between">
      <Box gap={1}>
        <Text bold color={statusColor}>● {status === 'Thinking...' ? 'WORKING' : status.toUpperCase()}</Text>
        <Text color="gray">│</Text>
        <Text bold color="green">{providerName}</Text>
      </Box>
      <Text><Text color="gray">BUILD / </Text><Text bold color="cyan">{agentLabel}</Text></Text>
      <Text color="gray">{workingDirectory}</Text>
    </Box>
  );
}

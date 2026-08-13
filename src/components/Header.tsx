import React from 'react';
import {Box, Text} from 'ink';

interface HeaderProps {
  workingDirectory: string;
  providerName: string;
  agentLabel: string;
  status: 'Ready' | 'Thinking...' | 'Error';
}

export function Header({workingDirectory, providerName, agentLabel, status}: HeaderProps): React.JSX.Element {
  return (
    <Box borderStyle="double" borderColor="green" paddingX={1} justifyContent="space-between">
      <Text bold color="green">[MODE] {providerName}</Text>
      <Text bold color="green">[AGENT] BUILD · {agentLabel}</Text>
      <Text color="green" dimColor>[ROOT] {workingDirectory}</Text>
      <Text color={status === 'Error' ? 'red' : status === 'Thinking...' ? 'yellow' : 'green'}>
        [{status.toUpperCase()}]
      </Text>
    </Box>
  );
}

import React from 'react';
import {Box, Text} from 'ink';
import type {AgentMode} from '../types/provider.js';

interface HeaderProps {
  workingDirectory: string;
  providerName: string;
  agentMode: AgentMode;
  agentLabel: string;
  status: 'Ready' | 'Thinking...' | 'Error';
}

export function Header({workingDirectory, providerName, agentMode, agentLabel, status}: HeaderProps): React.JSX.Element {
  return (
    <Box borderStyle="double" borderColor="green" paddingX={1} justifyContent="space-between">
      <Text bold color="green">[MODE] {providerName}</Text>
      <Text bold color={agentMode === 'build' ? 'green' : 'yellow'}>[AGENT] {agentMode.toUpperCase()}</Text>
      <Text color="green" dimColor>[ROLE] {agentLabel}</Text>
      <Text color="green" dimColor>[ROOT] {workingDirectory}</Text>
      <Text color={status === 'Error' ? 'red' : status === 'Thinking...' ? 'yellow' : 'green'}>
        [{status.toUpperCase()}]
      </Text>
    </Box>
  );
}

import React from 'react';
import {Box, Text} from 'ink';

interface HeaderProps {
  workingDirectory: string;
  providerName: string;
  status: 'Ready' | 'Thinking...' | 'Error';
}

export function Header({workingDirectory, providerName, status}: HeaderProps): React.JSX.Element {
  return (
    <Box borderStyle="round" paddingX={1} justifyContent="space-between">
      <Text bold color="cyan">PXHVibe | Provider: {providerName}</Text>
      <Text>{workingDirectory}</Text>
      <Text color={status === 'Error' ? 'red' : status === 'Thinking...' ? 'yellow' : 'green'}>
        {status}
      </Text>
    </Box>
  );
}

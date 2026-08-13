import React from 'react';
import {Box, Text} from 'ink';

interface HeaderProps {
  workingDirectory: string;
}

export function Header({workingDirectory}: HeaderProps): React.JSX.Element {
  return (
    <Box borderStyle="round" paddingX={1} justifyContent="space-between">
      <Text bold color="cyan">PXHVibe</Text>
      <Text>{workingDirectory}</Text>
      <Text color="green">Ready</Text>
    </Box>
  );
}

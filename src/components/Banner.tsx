import React from 'react';
import {Box, Text} from 'ink';
import {appVersion} from '../version.js';

export function Banner(): React.JSX.Element {
  return (
    <Box flexDirection="column" alignItems="center" marginTop={1} marginBottom={1}>
      <Box gap={0}>
        <Text bold color="cyan">╔══</Text>
        <Text inverse bold color="green"> PXHVibe v{appVersion} </Text>
        <Text bold color="cyan">══╗</Text>
      </Box>
      <Box gap={0}>
        <Text color="cyan">║</Text>
        <Text color="gray"> Terminal Coding Agent</Text>
        <Text color="cyan">║</Text>
      </Box>
      <Box gap={0}>
        <Text bold color="cyan">╚══════════════════════════════════════╝</Text>
      </Box>
    </Box>
  );
}

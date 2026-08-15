import React from 'react';
import {Box, Text} from 'ink';
import {appVersion} from '../version.js';

export function Banner(): React.JSX.Element {
  return (
    <Box justifyContent="center" paddingX={1}>
      <Text bold color="green">PXHVibe</Text>
      <Text color="gray"> v{appVersion} · Terminal Coding Agent</Text>
    </Box>
  );
}

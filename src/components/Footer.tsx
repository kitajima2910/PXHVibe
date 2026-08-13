import React from 'react';
import {Box, Text} from 'ink';

export function Footer(): React.JSX.Element {
  return (
    <Box gap={2} paddingX={1}>
      <Text dimColor>Enter: Send</Text>
      <Text dimColor>/modes: Switch mode</Text>
      <Text dimColor>Ctrl+C: Exit</Text>
    </Box>
  );
}

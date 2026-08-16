import React from 'react';
import {Box, Text} from 'ink';

export function Footer(): React.JSX.Element {
  return (
    <Box paddingX={1} justifyContent="center" marginTop={0}>
      <Text dimColor>
        <Text color="cyan">Enter</Text> send{' '}
        <Text dimColor>│</Text>{' '}
        <Text color="cyan">Shift+Enter</Text> newline{' '}
        <Text dimColor>│</Text>{' '}
        <Text color="cyan">Esc×2</Text> stop{' '}
        <Text dimColor>│</Text>{' '}
        <Text color="cyan">Alt+V</Text> image{' '}
        <Text dimColor>│</Text>{' '}
        <Text color="cyan">Ctrl+C</Text> exit
      </Text>
    </Box>
  );
}

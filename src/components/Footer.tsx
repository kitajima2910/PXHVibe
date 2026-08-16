import React from 'react';
import {Box, Text} from 'ink';

export function Footer(): React.JSX.Element {
  return (
    <Box paddingX={1} justifyContent="center" marginTop={0}>
      <Box gap={2}>
        <Box gap={1}>
          <Text bold color="cyan">Enter</Text>
          <Text dimColor>send</Text>
        </Box>
        <Text dimColor>│</Text>
        <Box gap={1}>
          <Text bold color="cyan">Shift+Enter</Text>
          <Text dimColor>newline</Text>
        </Box>
        <Text dimColor>│</Text>
        <Box gap={1}>
          <Text bold color="cyan">Esc×2</Text>
          <Text dimColor>stop</Text>
        </Box>
        <Text dimColor>│</Text>
        <Box gap={1}>
          <Text bold color="cyan">Alt+V</Text>
          <Text dimColor>image</Text>
        </Box>
        <Text dimColor>│</Text>
        <Box gap={1}>
          <Text bold color="cyan">Ctrl+C</Text>
          <Text dimColor>exit</Text>
        </Box>
      </Box>
    </Box>
  );
}

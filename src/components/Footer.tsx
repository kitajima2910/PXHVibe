import React from 'react';
import {Box, Text} from 'ink';

export function Footer(): React.JSX.Element {
  return (
    <Box paddingX={1} justifyContent="center" marginTop={0}>
      <Box gap={2}>
        <Box gap={1}>
          <Text bold color="magenta">Enter</Text>
          <Text dimColor>send</Text>
        </Box>
        <Text dimColor>│</Text>
        <Box gap={1}>
          <Text bold color="magenta">Shift+Enter</Text>
          <Text dimColor>newline</Text>
        </Box>
        <Text dimColor>│</Text>
        <Box gap={1}>
          <Text bold color="magenta">Esc×2</Text>
          <Text dimColor>stop</Text>
        </Box>
        <Text dimColor>│</Text>
        <Box gap={1}>
          <Text bold color="magenta">Alt+V</Text>
          <Text dimColor>image</Text>
        </Box>
        <Text dimColor>│</Text>
        <Box gap={1}>
          <Text bold color="magenta">Ctrl+C</Text>
          <Text dimColor>exit</Text>
        </Box>
      </Box>
    </Box>
  );
}

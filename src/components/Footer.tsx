import React from 'react';
import {Box, Text} from 'ink';

export function Footer(): React.JSX.Element {
  return (
    <Box paddingX={1} justifyContent="center">
      <Text dimColor>
        <Text color="green">Enter</Text> send  ·  <Text color="green">Shift+Enter</Text> newline  ·  <Text color="green">Wheel</Text> scroll  ·  <Text color="green">Alt+C</Text> copy  ·  <Text color="green">Alt+V</Text> image  ·  <Text color="green">Ctrl+C</Text> exit
      </Text>
    </Box>
  );
}

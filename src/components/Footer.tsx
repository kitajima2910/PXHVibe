import React from 'react';
import {Box, Text} from 'ink';

export function Footer(): React.JSX.Element {
  return (
    <Box gap={2} paddingX={1} justifyContent="center">
      <Text color="green" dimColor>[ENTER] SEND</Text>
      <Text color="green" dimColor>[/models] MODELS</Text>
      <Text color="green" dimColor>[/help] HELP</Text>
      <Text color="green" dimColor>[CTRL+C] EXIT</Text>
    </Box>
  );
}

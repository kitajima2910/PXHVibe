import React from 'react';
import {Box, Text} from 'ink';

export function Footer(): React.JSX.Element {
  return (
    <Box paddingX={1} justifyContent="center">
      <Text dimColor>
        <Text color="green">Enter</Text> send  ·  <Text color="green">PgUp/PgDn</Text> history  ·  <Text color="green">Alt+V</Text>/<Text color="green">/paste</Text> image  ·  <Text color="green">/models</Text> model  ·  <Text color="green">Ctrl+C</Text> exit
      </Text>
    </Box>
  );
}

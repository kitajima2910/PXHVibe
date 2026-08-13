import React from 'react';
import {Box, Text} from 'ink';

export function Footer(): React.JSX.Element {
  return (
    <Box paddingX={1} justifyContent="center" marginTop={0}>
      <Text dimColor>
        <Text color="cyan">ctrl+p</Text> commands  ·  <Text color="cyan">ctrl+x</Text> leader  ·  <Text color="cyan">enter</Text> send  ·  <Text color="cyan">ctrl+j</Text> newline
      </Text>
    </Box>
  );
}

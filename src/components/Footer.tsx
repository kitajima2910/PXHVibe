import React from 'react';
import {Box, Text} from 'ink';

export function Footer(): React.JSX.Element {
  return (
    <Box paddingX={1} justifyContent="center" marginTop={0}>
      <Text dimColor>
        <Text color="green">Enter</Text> gửi  ·  <Text color="green">Shift+Enter</Text>/<Text color="green">Ctrl+J</Text> xuống dòng  ·  <Text color="green">Alt+V</Text> ảnh  ·  <Text color="green">/help</Text> lệnh  ·  <Text color="green">Ctrl+C</Text> thoát
      </Text>
    </Box>
  );
}

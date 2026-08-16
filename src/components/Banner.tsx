import React from 'react';
import {Box, Text} from 'ink';
import {appVersion} from '../version.js';

export function Banner(): React.JSX.Element {
  return (
    <Box flexDirection="column" alignItems="center" marginTop={1} marginBottom={1}>
      <Text bold color="magenta">
        {'████  █   █ █   █ █   █ ███ ████  █████   '}
      </Text>
      <Text bold color="magenta">
        {'█░░░█  █ █ ░█░  █░█░  █░ █░░█░░░█ █░░░░░  '}
      </Text>
      <Text bold color="magenta">
        {'████░░  █ ░ █████░█░░ █░░█░░████░░████░░░ '}
      </Text>
      <Text bold color="cyan">
        {'█░░░░ ░█ █ ░█░░░█░░█░█ ░░█░░█░░░█ █░░░░   '}
      </Text>
      <Text bold color="cyan">
        {'█░░░░░█ ░ █ █░░░█░░ █ ░ ███░████░░█████░  '}
      </Text>
      <Text dimColor>
        {' ░░    ░ ░ ░ ░░  ░░  ░ ░ ░░░ ░░░░ ░░░░░░  '}
      </Text>
      <Text dimColor>
        {'  ░     ░   ░ ░   ░   ░   ░░░ ░░░░  ░░░░░ '}
      </Text>
      <Box marginTop={1}>
        <Text dimColor>Version {appVersion}</Text>
        <Text dimColor> · </Text>
        <Text color="yellow">Error404-Labs.Info.VN · Phạm Xuân Hoài</Text>
      </Box>
    </Box>
  );
}

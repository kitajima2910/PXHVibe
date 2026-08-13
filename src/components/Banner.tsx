import React from 'react';
import {Box, Text, useStdout} from 'ink';

const logo = String.raw`██████╗ ██╗  ██╗██╗  ██╗██╗   ██╗██╗██████╗ ███████╗
██╔══██╗╚██╗██╔╝██║  ██║██║   ██║██║██╔══██╗██╔════╝
██████╔╝ ╚███╔╝ ███████║██║   ██║██║██████╔╝█████╗  
██╔═══╝  ██╔██╗ ██╔══██║╚██╗ ██╔╝██║██╔══██╗██╔══╝  
██║     ██╔╝ ██╗██║  ██║ ╚████╔╝ ██║██████╔╝███████╗
╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝╚═════╝ ╚══════╝`;

export function Banner(): React.JSX.Element {
  const {stdout} = useStdout();
  const showLargeLogo = (stdout.columns ?? 80) >= 62;

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      <Text color="green" dimColor>01001101 01000001 01010100 01010010 01001001 01011000</Text>
      {showLargeLogo ? (
        <Text bold color="green">{logo}</Text>
      ) : (
        <Text bold color="green">{'[ P X H V i b e ]'}</Text>
      )}
      <Text bold color="green">Error404-Labs.Info.VN - Phạm Xuân Hoài</Text>
      <Text color="green" dimColor>{'// TERMINAL CODING SYSTEM // ACCESS GRANTED'}</Text>
    </Box>
  );
}

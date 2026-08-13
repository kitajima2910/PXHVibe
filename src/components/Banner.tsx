import React, {useEffect, useState} from 'react';
import {Box, Text, useStdout} from 'ink';
import {appVersion} from '../version.js';

const logo = String.raw`██████╗ ██╗  ██╗██╗  ██╗██╗   ██╗██╗██████╗ ███████╗
██╔══██╗╚██╗██╔╝██║  ██║██║   ██║██║██╔══██╗██╔════╝
██████╔╝ ╚███╔╝ ███████║██║   ██║██║██████╔╝█████╗  
██╔═══╝  ██╔██╗ ██╔══██║╚██╗ ██╔╝██║██╔══██╗██╔══╝  
██║     ██╔╝ ██╗██║  ██║ ╚████╔╝ ██║██████╔╝███████╗
╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝╚═════╝ ╚══════╝`;

export function Banner(): React.JSX.Element {
  const {stdout} = useStdout();
  const showLargeLogo = (stdout.columns ?? 80) >= 62;
  const [bootStep, setBootStep] = useState(0);

  useEffect(() => {
    if (bootStep >= bootMessages.length - 1) return;
    const timer = setTimeout(() => setBootStep((current) => current + 1), 260);
    return () => clearTimeout(timer);
  }, [bootStep]);

  return (
    <Box flexDirection="column" alignItems="center">
      {showLargeLogo ? (
        <Text bold color="green">{logo}</Text>
      ) : (
        <Text bold color="green">[ PXHVibe ]</Text>
      )}
      <Text bold color="green">Error404-Labs.Info.VN - Phạm Xuân Hoài</Text>
      <Text color={bootStep === bootMessages.length - 1 ? 'green' : 'cyan'} dimColor>
        {spinnerFrames[bootStep % spinnerFrames.length]} PXHVibe v{appVersion} · {bootMessages[bootStep]}
      </Text>
    </Box>
  );
}

const spinnerFrames = ['◐', '◓', '◑', '●'];
const bootMessages = ['BOOTING CORE', 'LOADING ROUTER', 'LINKING AGENTS', 'SYSTEM READY'];

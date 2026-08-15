import React, {useEffect, useState} from 'react';
import {Box, Text, useStdout} from 'ink';
import {appVersion} from '../version.js';

const logo = String.raw`██████╗ ██╗  ██╗██╗  ██╗██╗   ██╗██╗██████╗ ███████╗
██╔══██╗╚██╗██╔╝██║  ██║██║   ██║██║██╔══██╗██╔════╝
██████╔╝ ╚███╔╝ ███████║██║   ██║██║██████╔╝█████╗  
██╔═══╝  ██╔██╗ ██╔══██║╚██╗ ██╔╝██║██╔══██╗██╔══╝  
██║     ██╔╝ ██╗██║  ██║ ╚████╔╝ ██║██████╔╝███████╗
╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝╚═════╝ ╚══════╝`;

interface BannerProps {
  compact?: boolean;
}

export function Banner({compact = false}: BannerProps): React.JSX.Element {
  const {stdout} = useStdout();
  const [bootFinished, setBootFinished] = useState(false);
  const showLargeLogo = !compact && !bootFinished && (stdout.columns ?? 80) >= 62;

  useEffect(() => {
    if (compact || bootFinished) return;
    const timer = setTimeout(() => setBootFinished(true), 1_100);
    return () => clearTimeout(timer);
  }, [compact, bootFinished]);

  if (compact || bootFinished) {
    return (
      <Box justifyContent="center">
        <Text bold color="green">[ PXHVibe v{appVersion} ]</Text>
        <Text dimColor> · Error404-Labs.Info.VN</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" alignItems="center">
      {showLargeLogo ? (
        <Text bold color="green">{logo}</Text>
      ) : (
        <Text bold color="green">[ PXHVibe ]</Text>
      )}
      <Text bold color="green">Error404-Labs.Info.VN - Phạm Xuân Hoài</Text>
      <Text color="cyan" dimColor>
        {spinnerFrames[0]} PXHVibe v{appVersion} · {bootMessages[0]}
      </Text>
    </Box>
  );
}

const spinnerFrames = ['◐', '◓', '◑', '●'];
const bootMessages = ['BOOTING CORE', 'LOADING ROUTER', 'LINKING AGENTS', 'SYSTEM READY'];

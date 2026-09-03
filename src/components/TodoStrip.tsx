import React from 'react';
import {Box, Text} from 'ink';
import {mcpStatusSymbol, type MCPServerState, type MCPServerStatus} from '../mcp/MCPManager.js';

export const mcpConnectedColor = '#3fb950';

export function TodoStrip({mcpServers = []}: {mcpServers?: readonly MCPServerStatus[]}): React.JSX.Element {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="magenta" paddingX={1} flexGrow={1} minHeight={0} overflow="hidden">
      <Box flexDirection="column">
        <Box gap={1} marginBottom={1}>
          <Text bold color="magenta">◆</Text>
          <Text bold color="magenta">MCP</Text>
        </Box>
        {mcpServers.length === 0 && <Text dimColor>○ Chưa cấu hình</Text>}
        {mcpServers.map((server) => (
          <Text
            key={server.name}
            color={mcpServerColor(server.state)}
            bold={server.state === 'connected'}
          >
            {mcpStatusSymbol(server.state)} {server.name}
            {server.state === 'connected' ? ' · CONNECTED' : ''}
            {server.toolCount === undefined ? '' : ` · ${server.toolCount} tools`}
          </Text>
        ))}
      </Box>
    </Box>
  );
}

export function mcpServerColor(state: MCPServerState): string {
  if (state === 'connected') return mcpConnectedColor;
  if (state === 'error') return 'red';
  return 'gray';
}

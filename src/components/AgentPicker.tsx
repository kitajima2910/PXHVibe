import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import type {PXHAgent} from '../agents.js';

interface AgentPickerProps {
  agents: readonly PXHAgent[];
  onSelect: (agent: PXHAgent) => void;
  onCancel: () => void;
}

export function AgentPicker({agents, onSelect, onCancel}: AgentPickerProps): React.JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState(0);
  useInput((input, key) => {
    if (key.escape || (key.ctrl && input.toLowerCase() === 'c')) return onCancel();
    if (key.upArrow) return setSelectedIndex((current) => (current - 1 + agents.length) % agents.length);
    if (key.downArrow) return setSelectedIndex((current) => (current + 1) % agents.length);
    if (key.return) {
      const selected = agents[selectedIndex];
      if (selected !== undefined) onSelect(selected);
    }
  });

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="green" paddingX={1}>
      <Text bold color="green">[ SELECT SPECIALIST ]</Text>
      {agents.map((agent, index) => (
        <Text key={agent.id} bold={index === selectedIndex} color={index === selectedIndex ? 'green' : 'gray'}>
          {index === selectedIndex ? '› ' : '  '}{agent.label} — {agent.description}
        </Text>
      ))}
      <Text color="green" dimColor>↑/↓ SELECT  ENTER CONFIRM  ESC CLOSE</Text>
    </Box>
  );
}

import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import type {PXHAgent} from '../agents.js';
import {FormattedText} from './FormattedText.js';

interface AgentPickerProps {
  agents: readonly PXHAgent[];
  onSelect: (agent: PXHAgent) => void;
  onCancel: () => void;
}

export function AgentPicker({agents, onSelect, onCancel}: AgentPickerProps): React.JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedAgent = agents[selectedIndex];
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
    <Box flexDirection="column" borderStyle="single" borderColor="green" paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color="cyan">SPECIALISTS</Text>
        <Text dimColor>{agents.length === 0 ? '0/0' : `${selectedIndex + 1}/${agents.length}`}</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {agents.map((agent, index) => (
          <Text key={agent.id} bold={index === selectedIndex} color={index === selectedIndex ? 'green' : 'gray'}>
            {index === selectedIndex ? '● ' : '  '}{agent.label}
          </Text>
        ))}
      </Box>
      {selectedAgent !== undefined ? (
        <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text bold color="green">{selectedAgent.label}</Text>
          <FormattedText content={compactAgentDescription(selectedAgent.description)} />
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Text dimColor><Text color="green">↑↓</Text> chọn  ·  <Text color="green">Enter</Text> sử dụng  ·  <Text color="green">Esc</Text> đóng</Text>
      </Box>
    </Box>
  );
}

export function compactAgentDescription(value: string, maxLength = 140): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length <= maxLength ? compact : `${compact.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

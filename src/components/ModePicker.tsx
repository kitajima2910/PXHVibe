import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import type {PXHMode} from '../modes.js';

interface ModePickerProps {
  modes: readonly PXHMode[];
  onSelect: (mode: PXHMode) => void;
  onCancel: () => void;
}

export function ModePicker({modes, onSelect, onCancel}: ModePickerProps): React.JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input.toLowerCase() === 'c')) {
      onCancel();
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((current) => (current - 1 + modes.length) % modes.length);
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((current) => (current + 1) % modes.length);
      return;
    }
    if (key.return) {
      const selectedMode = modes[selectedIndex];
      if (selectedMode !== undefined) onSelect(selectedMode);
    }
  });

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="green" paddingX={1}>
      <Text bold color="green">[ SELECT MODEL ]</Text>
      {modes.map((mode, index) => (
        <Text key={mode.id} bold={index === selectedIndex} color={index === selectedIndex ? 'green' : 'gray'}>
          {index === selectedIndex ? '› ' : '  '}{mode.label} — {mode.description}
        </Text>
      ))}
      <Text dimColor>↑/↓: Chọn  Enter: Xác nhận  Esc: Đóng</Text>
    </Box>
  );
}

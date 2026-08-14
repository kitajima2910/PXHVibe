import React, {useEffect, useState} from 'react';
import {Box, Text, useInput} from 'ink';
import type {PXHMode} from '../modes.js';
import type {ModelHealthReport} from '../utils/modelHealth.js';

interface ModePickerProps {
  modes: readonly PXHMode[];
  healthReport: ModelHealthReport | undefined;
  isCheckingHealth: boolean;
  onSelect: (mode: PXHMode) => void;
  onCancel: () => void;
}

export function ModePicker({modes, healthReport, isCheckingHealth, onSelect, onCancel}: ModePickerProps): React.JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (healthReport?.recommendedModeId === undefined) return;
    const recommendedIndex = modes.findIndex((mode) => mode.id === healthReport.recommendedModeId);
    if (recommendedIndex >= 0) setSelectedIndex(recommendedIndex);
  }, [healthReport?.recommendedModeId, modes]);

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
      <Text bold color="green">[ SELECT MODEL ] {isCheckingHealth ? '· CHECKING FREE MODELS...' : ''}</Text>
      {modes.map((mode, index) => {
        const health = healthReport?.results.find((result) => result.modeId === mode.id);
        const isRecommended = healthReport?.recommendedModeId === mode.id;
        const healthLabel = mode.provider !== 'free'
          ? ''
          : isCheckingHealth && health === undefined
            ? ' · checking'
            : health === undefined
              ? ''
              : health.ok
                ? ` · online ${(health.latencyMs / 1000).toFixed(1)}s`
                : ' · offline';
        const color = index === selectedIndex ? 'green' : health?.ok === false ? 'red' : 'gray';
        return (
          <Text key={mode.id} bold={index === selectedIndex || isRecommended} color={color}>
            {index === selectedIndex ? '› ' : '  '}{mode.label} — {mode.description}{healthLabel}{isRecommended ? ' · ★ ĐỀ XUẤT' : ''}
          </Text>
        );
      })}
      <Text dimColor>↑/↓: Chọn  Enter: Xác nhận  Esc: Đóng</Text>
    </Box>
  );
}

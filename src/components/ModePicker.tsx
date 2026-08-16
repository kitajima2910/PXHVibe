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
  const selectedMode = modes[selectedIndex];
  const selectedHealth = selectedMode === undefined
    ? undefined
    : healthReport?.results.find((result) => result.modeId === selectedMode.id);

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
    <Box flexDirection="column" borderStyle="single" borderColor="magenta" paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color="magenta">MODELS {isCheckingHealth ? '· đang kiểm tra...' : ''}</Text>
        <Text dimColor>{modes.length === 0 ? '0/0' : `${selectedIndex + 1}/${modes.length}`}</Text>
      </Box>
      <Box flexDirection="column" marginTop={1}>
        {modes.map((mode, index) => {
          const health = healthReport?.results.find((result) => result.modeId === mode.id);
          const isRecommended = healthReport?.recommendedModeId === mode.id;
          const healthLabel = mode.provider !== 'free'
            ? 'custom'
            : isCheckingHealth && health === undefined
              ? 'checking'
              : health === undefined
                ? 'chưa kiểm tra'
                : health.ok
                  ? `online ${(health.latencyMs / 1000).toFixed(1)}s`
                  : 'offline';
          const color = index === selectedIndex ? 'magenta' : health?.ok === false ? 'red' : 'gray';
          return (
            <Box key={mode.id} justifyContent="space-between">
              <Text bold={index === selectedIndex || isRecommended} color={color}>
                {index === selectedIndex ? '● ' : '  '}{mode.label}{isRecommended ? ' ★ ĐỀ XUẤT' : ''}
              </Text>
              <Text color={health?.ok === false ? 'red' : 'gray'}>{healthLabel}</Text>
            </Box>
          );
        })}
      </Box>
      {selectedMode === undefined ? null : (
        <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text bold color="magenta">{selectedMode.label}</Text>
          <Text>{selectedMode.description}</Text>
          {selectedMode.provider === 'free' && selectedHealth !== undefined ? (
            <Text dimColor>{selectedHealth.ok ? `Phản hồi ${(selectedHealth.latencyMs / 1000).toFixed(1)}s` : 'Không phản hồi trong lần kiểm tra gần nhất'}</Text>
          ) : null}
        </Box>
      )}
      <Box marginTop={1}>
        <Text dimColor><Text color="magenta">↑↓</Text> chọn  ·  <Text color="magenta">Enter</Text> sử dụng  ·  <Text color="magenta">Esc</Text> đóng</Text>
      </Box>
    </Box>
  );
}

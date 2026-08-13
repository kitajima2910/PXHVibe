import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import type {CustomApiConfig} from '../providers/CustomAgentProvider.js';

interface CustomApiSetupProps {
  onComplete: (config: CustomApiConfig) => void;
  onCancel: () => void;
}

const fields = ['baseURL', 'model', 'apiKey'] as const;
type Field = (typeof fields)[number];

const fieldLabels: Record<Field, string> = {
  baseURL: 'Base URL',
  model: 'Model',
  apiKey: 'API key',
};

export function CustomApiSetup({onComplete, onCancel}: CustomApiSetupProps): React.JSX.Element {
  const [fieldIndex, setFieldIndex] = useState(0);
  const [values, setValues] = useState<Record<Field, string>>({
    baseURL: '',
    model: '',
    apiKey: '',
  });
  const field = fields[fieldIndex] ?? 'baseURL';

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.backspace || key.delete) {
      setValues((current) => ({...current, [field]: current[field].slice(0, -1)}));
      return;
    }
    if (key.return) {
      if (field !== 'apiKey' && values[field].trim().length === 0) return;
      if (fieldIndex < fields.length - 1) {
        setFieldIndex((current) => current + 1);
      } else {
        onComplete({
          baseURL: values.baseURL.trim().replace(/\/$/, ''),
          model: values.model.trim(),
          apiKey: values.apiKey,
        });
      }
      return;
    }
    if (!key.ctrl && !key.meta && input.length > 0) {
      setValues((current) => ({...current, [field]: current[field] + input}));
    }
  });

  const visibleValue = field === 'apiKey' ? '•'.repeat(values.apiKey.length) : values[field];
  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1}>
      <Text bold color="cyan">Custom API</Text>
      <Text>{fieldLabels[field]}: {visibleValue}<Text inverse> </Text></Text>
      <Text dimColor>
        Endpoint phải tương thích OpenAI Responses API. API key chỉ giữ trong bộ nhớ.
      </Text>
      <Text dimColor>Enter: Tiếp tục  Esc: Hủy</Text>
    </Box>
  );
}

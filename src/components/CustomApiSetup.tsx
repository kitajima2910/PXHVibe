import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import type {CustomApiConfig, CustomProviderType} from '../providers/CustomAgentProvider.js';
import {parseTerminalMouse} from '../utils/mouse.js';

interface CustomApiSetupProps {
  onComplete: (config: CustomApiConfig) => void;
  onCancel: () => void;
}

const providerOptions: readonly CustomProviderType[] = ['openai', 'anthropic', 'gemini'];
const fields: readonly (keyof CustomApiConfig)[] = ['provider', 'baseURL', 'model', 'apiKey'];
type Field = (typeof fields)[number];

const fieldLabels: Record<Field, string> = {
  provider: 'Provider',
  baseURL: 'Base URL',
  model: 'Model',
  apiKey: 'API key',
};

const providerLabels: Record<CustomProviderType, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic (Claude)',
  gemini: 'Google Gemini',
};

export function CustomApiSetup({onComplete, onCancel}: CustomApiSetupProps): React.JSX.Element {
  const [fieldIndex, setFieldIndex] = useState(0);
  const [providerIndex, setProviderIndex] = useState(0);
  const [values, setValues] = useState<Record<Field, string>>({
    provider: '',
    baseURL: '',
    model: '',
    apiKey: '',
  });
  const field = fields[fieldIndex] ?? 'provider';

  useInput((input, key) => {
    if (parseTerminalMouse(input) !== undefined) return;
    if (key.escape || (key.ctrl && input.toLowerCase() === 'c')) {
      onCancel();
      return;
    }
    if (key.backspace || key.delete) {
      setValues((current) => ({...current, [field]: current[field].slice(0, -1)}));
      return;
    }
    if (key.tab && !key.shift) {
      setProviderIndex((current) => (current + 1) % providerOptions.length);
      return;
    }
    if (key.tab && key.shift) {
      setProviderIndex((current) => (current === 0 ? providerOptions.length - 1 : current - 1));
      return;
    }
    if (key.return) {
      if (field === 'provider') {
        setFieldIndex((current) => current + 1);
        setValues((current) => ({...current, provider: providerOptions[providerIndex] ?? 'openai'}));
        return;
      }
      if (values[field].trim().length === 0) return;
      if (fieldIndex < fields.length - 1) {
        setFieldIndex((current) => current + 1);
      } else {
        onComplete({
          baseURL: values.baseURL.trim().replace(/\/$/, ''),
          model: values.model.trim(),
          apiKey: values.apiKey,
          provider: providerOptions[providerIndex] ?? 'openai',
        });
      }
      return;
    }
    if (field !== 'provider' && !key.ctrl && !key.meta && input.length > 0) {
      setValues((current) => ({...current, [field]: current[field] + input}));
    }
  });

  const selectedProvider = providerOptions[providerIndex] ?? 'openai';
  const visibleValue = field === 'apiKey'
    ? '•'.repeat(values.apiKey.length)
    : field === 'provider'
      ? providerLabels[selectedProvider]
      : values[field];

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="magenta" paddingX={1}>
      <Text bold color="magenta">[ CUSTOM API UPLINK ]</Text>
      <Text>{fieldLabels[field]}: {visibleValue}<Text inverse> </Text></Text>
      {field === 'provider' && (
        <Text dimColor>
          Tab chuyển OpenAI/Anthropic/Gemini · Enter: Tiếp tục · Esc: Hủy
        </Text>
      )}
      {field !== 'provider' && (
        <Text dimColor>
          Endpoint tương thích OpenAI Responses/Anthropic Messages/Gemini API. API key chỉ giữ trong bộ nhớ.
        </Text>
      )}
      <Text dimColor>Enter: Tiếp tục  Esc: Hủy</Text>
    </Box>
  );
}

import React, {useState} from 'react';
import {Box, Text, useApp, useInput} from 'ink';

interface PromptInputProps {
  onSubmit: (value: string) => void;
}

export function PromptInput({onSubmit}: PromptInputProps): React.JSX.Element {
  const [value, setValue] = useState('');
  const {exit} = useApp();

  useInput((input, key) => {
    if (key.ctrl && input.toLowerCase() === 'c') {
      exit();
      return;
    }

    if (key.return) {
      const prompt = value.trim();
      if (prompt.length > 0) {
        onSubmit(prompt);
        setValue('');
      }
      return;
    }

    if (key.backspace || key.delete) {
      setValue((currentValue) => currentValue.slice(0, -1));
      return;
    }

    if (!key.ctrl && !key.meta && input.length > 0) {
      setValue((currentValue) => currentValue + input);
    }
  });

  return (
    <Box borderStyle="round" paddingX={1}>
      <Text bold color="green">Prompt: </Text>
      <Text>{value}</Text>
      <Text inverse> </Text>
    </Box>
  );
}

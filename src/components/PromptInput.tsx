import React, {useState} from 'react';
import {Box, Text, useApp, useInput} from 'ink';

interface PromptInputProps {
  onSubmit: (value: string) => void;
  onExit: () => void;
  isBusy: boolean;
}

export function PromptInput({onSubmit, onExit, isBusy}: PromptInputProps): React.JSX.Element {
  const [value, setValue] = useState('');
  const {exit} = useApp();

  useInput((input, key) => {
    if (key.ctrl && input.toLowerCase() === 'c') {
      onExit();
      exit();
      return;
    }

    if (isBusy) {
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
    <Box flexDirection="column" borderStyle="double" borderColor={isBusy ? 'yellow' : 'green'} paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color={isBusy ? 'yellow' : 'green'}>
          {isBusy ? '[ AGENT // PROCESSING ]' : '[ COMMAND // INPUT ]'}
        </Text>
        <Text dimColor>{isBusy ? 'LOCKED' : 'BUILD READY'}</Text>
      </Box>
      <Box>
        <Text bold color="green">root@pxhvibe</Text>
        <Text color="gray">:</Text>
        <Text bold color="cyan">~</Text>
        <Text color="gray">$ </Text>
        {isBusy ? (
          <Text color="yellow">◉ Agent đang xử lý TARGET...</Text>
        ) : (
          <>
            <Text color={value.length === 0 ? 'gray' : 'white'}>
              {value.length === 0 ? 'Nhập TARGET hoặc /help' : value}
            </Text>
            <Text inverse color="green"> </Text>
          </>
        )}
      </Box>
      <Text dimColor>{isBusy ? 'Theo dõi EVENT phía trên' : 'ENTER gửi  ·  /agents specialist  ·  /models model  ·  CTRL+C thoát'}</Text>
    </Box>
  );
}

import React, {useEffect, useState} from 'react';
import {Box, Text, useApp, useInput} from 'ink';

interface PromptInputProps {
  onSubmit: (value: string) => void;
  onExit: () => void;
  isBusy: boolean;
}

export function PromptInput({onSubmit, onExit, isBusy}: PromptInputProps): React.JSX.Element {
  const [value, setValue] = useState('');
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const {exit} = useApp();

  useEffect(() => {
    if (!isBusy) {
      setSpinnerIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setSpinnerIndex((current) => (current + 1) % processingFrames.length);
    }, 120);
    return () => clearInterval(timer);
  }, [isBusy]);

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
    <Box flexDirection="column" borderStyle="single" borderColor={isBusy ? 'yellow' : 'green'} paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color={isBusy ? 'yellow' : 'green'}>
          {isBusy ? 'AGENT WORKING' : 'NEW TARGET'}
        </Text>
        <Text dimColor>{isBusy ? 'input locked' : 'build mode'}</Text>
      </Box>
      <Box>
        <Text bold color="green">root@pxhvibe</Text>
        <Text color="gray">:</Text>
        <Text bold color="cyan">~</Text>
        <Text color="gray">$ </Text>
        {isBusy ? (
          <Text color="yellow">{processingFrames[spinnerIndex]} đang phân tích và triển khai...</Text>
        ) : (
          <>
            <Text color={value.length === 0 ? 'gray' : 'white'}>
              {value.length === 0 ? 'Nhập TARGET hoặc /help' : value}
            </Text>
            <Text inverse color="green"> </Text>
          </>
        )}
      </Box>
    </Box>
  );
}

const processingFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

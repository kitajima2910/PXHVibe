import React, {useEffect, useRef, useState} from 'react';
import {Box, Text, measureElement, useApp, useInput, type DOMElement} from 'ink';
import type {ImageAttachment} from '../types/attachment.js';
import {ImageThumbnail} from './ImageThumbnail.js';
import {parseTerminalMouse} from '../utils/mouse.js';

interface PromptInputProps {
  onSubmit: (value: string) => void;
  onExit: () => void;
  isBusy: boolean;
  attachments: readonly ImageAttachment[];
  onPasteImage: () => void;
  onRemoveLastImage: () => void;
}

export function PromptInput({onSubmit, onExit, isBusy, attachments, onPasteImage, onRemoveLastImage}: PromptInputProps): React.JSX.Element {
  const [value, setValue] = useState('');
  const [cursorIndex, setCursorIndex] = useState(0);
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const {exit} = useApp();
  const editorRef = useRef<DOMElement>(null);

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
    const mouse = parseTerminalMouse(input);
    if (mouse !== undefined) {
      if (mouse.button === 'left' && mouse.action === 'press' && editorRef.current !== null) {
        const metrics = measureElement(editorRef.current);
        const clickedIndex = getCursorIndexFromPoint(mouse.x, mouse.y, metrics, value.length);
        if (clickedIndex !== undefined) setCursorIndex(clickedIndex);
      }
      return;
    }

    if (key.ctrl && input.toLowerCase() === 'c') {
      onExit();
      exit();
      return;
    }

    if (isBusy) {
      return;
    }

    if (isPasteShortcut(input, key)) {
      onPasteImage();
      return;
    }

    if (key.return) {
      const prompt = value.trim();
      if (prompt.toLowerCase() === '/paste') {
        onPasteImage();
        setValue('');
        setCursorIndex(0);
        return;
      }
      if (prompt.length > 0) {
        onSubmit(prompt);
        setValue('');
        setCursorIndex(0);
      }
      return;
    }

    if (key.leftArrow) {
      setCursorIndex((current) => Math.max(0, current - 1));
      return;
    }

    if (key.rightArrow) {
      setCursorIndex((current) => Math.min(value.length, current + 1));
      return;
    }

    if (key.home) {
      setCursorIndex(0);
      return;
    }

    if (key.end) {
      setCursorIndex(value.length);
      return;
    }

    if (key.upArrow || key.downArrow) {
      const editorWidth = editorRef.current === null
        ? 40
        : Math.max(1, measureElement(editorRef.current).width);
      setCursorIndex((current) => moveCursorVertically(
        current,
        value.length,
        editorWidth,
        key.upArrow ? -1 : 1,
      ));
      return;
    }

    if (key.backspace) {
      if (value.length === 0 && attachments.length > 0) {
        onRemoveLastImage();
        return;
      }
      if (cursorIndex > 0) {
        setValue((currentValue) => currentValue.slice(0, cursorIndex - 1) + currentValue.slice(cursorIndex));
        setCursorIndex((current) => current - 1);
      }
      return;
    }

    if (key.delete) {
      if (value.length === 0 && attachments.length > 0) {
        onRemoveLastImage();
        return;
      }
      if (cursorIndex < value.length) {
        setValue((currentValue) => currentValue.slice(0, cursorIndex) + currentValue.slice(cursorIndex + 1));
      }
      return;
    }

    if (!key.ctrl && !key.meta && input.length > 0) {
      setValue((currentValue) => currentValue.slice(0, cursorIndex) + input + currentValue.slice(cursorIndex));
      setCursorIndex((current) => current + input.length);
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
      {attachments.length > 0 && (
        <Box marginBottom={1}>
          {attachments.map((image) => <ImageThumbnail key={image.path} image={image} />)}
        </Box>
      )}
      <Box>
        <Text bold color="green">root@pxhvibe</Text>
        <Text color="gray">:</Text>
        <Text bold color="cyan">~</Text>
        <Text color="gray">$ </Text>
        {isBusy ? (
          <Text color="yellow">{processingFrames[spinnerIndex]} đang phân tích và triển khai...</Text>
        ) : (
          <Box ref={editorRef} flexGrow={1}>
            {value.length === 0 ? (
              <Text><Text inverse color="green"> </Text><Text color="gray"> Nhập TARGET hoặc /help</Text></Text>
            ) : (
              <Text color="white">
                {value.slice(0, cursorIndex)}
                <Text inverse color="green">{value[cursorIndex] ?? ' '}</Text>
                {cursorIndex < value.length ? value.slice(cursorIndex + 1) : ''}
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}

const processingFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function isPasteShortcut(
  input: string,
  key: {ctrl: boolean; meta: boolean},
): boolean {
  const character = input.toLowerCase();
  return (key.meta && character === 'v')
    || (key.ctrl && character === 'v')
    || input === '\x16';
}

export function moveCursorVertically(
  cursorIndex: number,
  valueLength: number,
  lineWidth: number,
  direction: -1 | 1,
): number {
  return Math.max(0, Math.min(valueLength, cursorIndex + direction * Math.max(1, lineWidth)));
}

export function getCursorIndexFromPoint(
  x: number,
  y: number,
  metrics: {x: number; y: number; width: number; height: number},
  valueLength: number,
): number | undefined {
  if (
    x < metrics.x || x >= metrics.x + metrics.width
    || y < metrics.y || y >= metrics.y + Math.max(1, metrics.height)
  ) return undefined;
  const index = (y - metrics.y) * Math.max(1, metrics.width) + (x - metrics.x);
  return Math.min(valueLength, index);
}

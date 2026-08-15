import React, {useEffect, useRef, useState} from 'react';
import {Box, Text, measureElement, useApp, useInput, usePaste, useStdout, type DOMElement} from 'ink';
import type {ImageAttachment} from '../types/attachment.js';
import {ImageThumbnail} from './ImageThumbnail.js';
import {parseTerminalMouse} from '../utils/mouse.js';
import {countDisplayLines, countTextLines} from '../utils/pastedText.js';

export interface PromptDraft {
  value: string;
  cursorIndex: number;
  pastedBlocks: string[];
}

interface PromptInputProps {
  onSubmit: (value: string, preservedDraft?: PromptDraft) => void;
  onCancel: () => void;
  onExit: () => void;
  isBusy: boolean;
  attachments: readonly ImageAttachment[];
  onPasteImage: () => void;
  onRemoveLastImage: () => void;
  busyStartedAt?: number;
  lastActivityAt?: number;
  activityLabel?: string;
  phaseLabel?: string;
  initialDraft?: PromptDraft;
}

export function PromptInput({onSubmit, onCancel, onExit, isBusy, attachments, onPasteImage, onRemoveLastImage, busyStartedAt, lastActivityAt, activityLabel, phaseLabel, initialDraft}: PromptInputProps): React.JSX.Element {
  const [value, setValue] = useState(initialDraft?.value ?? '');
  const [cursorIndex, setCursorIndex] = useState(initialDraft?.cursorIndex ?? 0);
  const [pastedBlocks, setPastedBlocks] = useState<string[]>(initialDraft?.pastedBlocks ?? []);
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const [cancelArmed, setCancelArmed] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());
  const {exit} = useApp();
  const {stdout} = useStdout();
  const editorRef = useRef<DOMElement>(null);
  const lastEscapeAtRef = useRef(0);
  const cancelTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const editorWidth = Math.max(20, (stdout.columns ?? 80) - 21);
  const inputViewport = createInputViewport(value, cursorIndex, editorWidth, 5);

  useEffect(() => {
    if (!isBusy) {
      setSpinnerIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setSpinnerIndex((current) => (current + 1) % processingFrames.length);
      setClockNow(Date.now());
    }, 120);
    return () => clearInterval(timer);
  }, [isBusy]);

  useEffect(() => {
    if (isBusy) return;
    lastEscapeAtRef.current = 0;
    setCancelArmed(false);
    if (cancelTimerRef.current !== undefined) clearTimeout(cancelTimerRef.current);
  }, [isBusy]);

  useEffect(() => () => {
    if (cancelTimerRef.current !== undefined) clearTimeout(cancelTimerRef.current);
  }, []);

  usePaste((text) => {
    if (isBusy || text.length === 0) return;
    if (shouldCollapsePaste(text)) {
      setPastedBlocks((current) => [...current, text]);
      return;
    }
    setValue((currentValue) => currentValue.slice(0, cursorIndex) + text + currentValue.slice(cursorIndex));
    setCursorIndex((current) => current + text.length);
  }, {isActive: !isBusy});

  useInput((input, key) => {
    const mouse = parseTerminalMouse(input);
    if (mouse !== undefined) {
      if (editorRef.current !== null) {
        const metrics = measureElement(editorRef.current);
        const insideEditor = mouse.x >= metrics.x && mouse.x < metrics.x + metrics.width
          && mouse.y >= metrics.y && mouse.y < metrics.y + metrics.height;
        if (insideEditor && mouse.button === 'wheel-up') {
          setCursorIndex((current) => moveCursorVertically(current, value.length, editorWidth, -1));
        } else if (insideEditor && mouse.button === 'wheel-down') {
          setCursorIndex((current) => moveCursorVertically(current, value.length, editorWidth, 1));
        } else if (insideEditor && mouse.button === 'left' && mouse.action === 'press') {
          const clickedIndex = getCursorIndexFromViewportPoint(
            mouse.x,
            mouse.y,
            metrics,
            inputViewport.lines,
          );
          if (clickedIndex !== undefined) setCursorIndex(clickedIndex);
        }
      }
      return;
    }

    if (key.ctrl && input.toLowerCase() === 'c') {
      onExit();
      exit();
      return;
    }

    if (isBusy && key.escape) {
      const now = Date.now();
      if (now - lastEscapeAtRef.current <= 1_000) {
        lastEscapeAtRef.current = 0;
        setCancelArmed(false);
        if (cancelTimerRef.current !== undefined) clearTimeout(cancelTimerRef.current);
        onCancel();
        return;
      }
      lastEscapeAtRef.current = now;
      setCancelArmed(true);
      if (cancelTimerRef.current !== undefined) clearTimeout(cancelTimerRef.current);
      cancelTimerRef.current = setTimeout(() => {
        lastEscapeAtRef.current = 0;
        setCancelArmed(false);
      }, 1_000);
      return;
    }

    if (isBusy) {
      return;
    }

    if (isPasteShortcut(input, key)) {
      onPasteImage();
      return;
    }

    if (key.return || isNewlineShortcut(input, key)) {
      if (isNewlineShortcut(input, key)) {
        setValue((currentValue) => currentValue.slice(0, cursorIndex) + '\n' + currentValue.slice(cursorIndex));
        setCursorIndex((current) => current + 1);
        return;
      }
      const editablePrompt = value.trim();
      if (editablePrompt.toLowerCase() === '/paste' && pastedBlocks.length === 0) {
        onPasteImage();
        setValue('');
        setCursorIndex(0);
        return;
      }
      if (isSlashCommandInput(editablePrompt)) {
        const shouldPreserveDraft = !['/new', '/clear'].includes(editablePrompt.toLowerCase());
        onSubmit(editablePrompt, shouldPreserveDraft
          ? {value: '', cursorIndex: 0, pastedBlocks: [...pastedBlocks]}
          : undefined);
        setValue('');
        setCursorIndex(0);
        if (!shouldPreserveDraft) setPastedBlocks([]);
        return;
      }
      const prompt = composePromptInput(editablePrompt, pastedBlocks);
      if (prompt.length > 0) {
        onSubmit(prompt);
        setValue('');
        setCursorIndex(0);
        setPastedBlocks([]);
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
      if (value.length === 0 && pastedBlocks.length > 0) {
        setPastedBlocks((current) => current.slice(0, -1));
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

  const elapsedSeconds = isBusy && busyStartedAt !== undefined
    ? Math.max(0, Math.floor((clockNow - busyStartedAt) / 1_000))
    : 0;
  const idleSeconds = isBusy && lastActivityAt !== undefined
    ? Math.max(0, Math.floor((clockNow - lastActivityAt) / 1_000))
    : 0;
  const isStalled = idleSeconds >= 60;
  const isVeryStalled = idleSeconds >= 180;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={isBusy ? 'yellow' : 'green'} paddingX={1}>
      <Box justifyContent="space-between">
        <Text bold color={isBusy ? 'yellow' : 'green'}>
          {isBusy ? `⠿ WORKING · ${formatElapsed(elapsedSeconds)}` : '❯ NEW TARGET'}
        </Text>
        <Text dimColor>{isBusy ? (cancelArmed ? 'ESC lần nữa để dừng' : `${phaseLabel ?? 'khởi động'} · Esc×2 dừng lượt`) : 'Enter gửi · Shift+Enter xuống dòng'}</Text>
      </Box>
      {attachments.length > 0 && (
        <Box marginBottom={1}>
          {attachments.map((image) => <ImageThumbnail key={image.path} image={image} />)}
        </Box>
      )}
      {pastedBlocks.length > 0 && (
        <Box flexDirection="column">
          {pastedBlocks.slice(-3).map((block, index) => (
            <Text key={`${block.length}-${index}`}>
              <Text bold color="cyan">~{countDisplayLines(block, editorWidth)} dòng</Text>
            </Text>
          ))}
          {pastedBlocks.length > 3 && <Text dimColor>+{pastedBlocks.length - 3} clipboard cũ</Text>}
        </Box>
      )}
      <Box flexDirection="column">
        <Box>
        <Text bold color="cyan">❯ </Text>
        {isBusy ? (
          <Text color={isVeryStalled ? 'red' : 'yellow'}>{cancelArmed ? 'Nhấn ESC lần nữa để dừng lượt chạy.' : `${processingFrames[spinnerIndex]} ${activityLabel ?? 'Đang khởi động worker...'}`}</Text>
        ) : (
          <Box flexDirection="column" flexGrow={1} flexBasis={0} width={editorWidth}>
            {value.length === 0 ? (
              <Box ref={editorRef}><Text><Text inverse color="green"> </Text><Text color="gray"> Nhập TARGET · /help · /models</Text></Text></Box>
            ) : (
              <>
                {inputViewport.hiddenAbove > 0 && <Text color="cyan">↑ {inputViewport.hiddenAbove} lines</Text>}
                <Box ref={editorRef} flexDirection="column" overflow="hidden">
                  <Text color="white">
                    {inputViewport.text.slice(0, inputViewport.cursorIndex)}
                    <Text inverse color="green">{inputViewport.text[inputViewport.cursorIndex] ?? ' '}</Text>
                    {inputViewport.cursorIndex < inputViewport.text.length
                      ? inputViewport.text.slice(inputViewport.cursorIndex + 1)
                      : ''}
                  </Text>
                </Box>
                {inputViewport.hiddenBelow > 0 && <Text color="cyan">↓ {inputViewport.hiddenBelow} lines</Text>}
              </>
            )}
          </Box>
        )}
        </Box>
        {isBusy && isStalled && !cancelArmed && (
          <Text color={isVeryStalled ? 'red' : 'yellow'}>
            {isVeryStalled ? '⚠' : '·'} Không có sự kiện mới {formatElapsed(idleSeconds)} · đang chờ model/runtime; Esc×2 dừng lượt chạy (không hoàn tác file).
          </Text>
        )}
      </Box>
    </Box>
  );
}

const processingFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function formatElapsed(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function isPasteShortcut(
  input: string,
  key: {ctrl: boolean; meta: boolean},
): boolean {
  const character = input.toLowerCase();
  return (key.meta && character === 'v')
    || (key.ctrl && character === 'v')
    || input === '\x16';
}

export function isNewlineShortcut(
  input: string,
  key: {return: boolean; shift: boolean; meta?: boolean; ctrl?: boolean},
): boolean {
  return (key.return && key.shift)
    || (key.return && key.meta === true)
    || (key.return && key.ctrl === true)
    || input === '[27;2;13~';
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

interface InputViewportLine {
  start: number;
  end: number;
  text: string;
}

export interface InputViewport {
  text: string;
  cursorIndex: number;
  lines: readonly InputViewportLine[];
  hiddenAbove: number;
  hiddenBelow: number;
}

export function createInputViewport(
  value: string,
  cursorIndex: number,
  lineWidth: number,
  maxLines: number,
): InputViewport {
  const width = Math.max(1, lineWidth);
  const lines: InputViewportLine[] = [];
  let start = 0;
  let text = '';
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index] ?? '';
    if (character === '\n') {
      lines.push({start, end: index, text});
      start = index + 1;
      text = '';
      continue;
    }
    text += character;
    if (text.length === width) {
      lines.push({start, end: index + 1, text});
      start = index + 1;
      text = '';
    }
  }
  if (text.length > 0 || start === value.length) lines.push({start, end: value.length, text});
  let cursorLine = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line !== undefined && cursorIndex >= line.start && cursorIndex <= line.end) cursorLine = index;
  }
  const limit = Math.max(1, maxLines);
  const firstLine = Math.max(0, Math.min(lines.length - limit, cursorLine - Math.floor(limit / 2)));
  const visibleLines = lines.slice(firstLine, firstLine + limit);
  let relativeCursor = 0;
  const localCursorLine = Math.max(0, cursorLine - firstLine);
  for (const [index, line] of visibleLines.entries()) {
    if (index === localCursorLine) {
      relativeCursor += Math.min(line.text.length, cursorIndex - line.start);
      break;
    }
    relativeCursor += line.text.length + 1;
  }
  return {
    text: visibleLines.map((line) => line.text).join('\n'),
    cursorIndex: relativeCursor,
    lines: visibleLines,
    hiddenAbove: firstLine,
    hiddenBelow: Math.max(0, lines.length - firstLine - visibleLines.length),
  };
}

export function getCursorIndexFromViewportPoint(
  x: number,
  y: number,
  metrics: {x: number; y: number; width: number; height: number},
  lines: readonly InputViewportLine[],
): number | undefined {
  const row = y - metrics.y;
  const line = lines[row];
  if (x < metrics.x || x >= metrics.x + metrics.width || line === undefined) return undefined;
  return Math.min(line.end, line.start + x - metrics.x);
}

export function shouldCollapsePaste(value: string): boolean {
  return value.length >= 300 || countLines(value) >= 4;
}

export function countLines(value: string): number {
  return countTextLines(value);
}

export function createPastePreview(value: string): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length > 72 ? `${compact.slice(0, 69)}...` : compact;
}

function formatCharacterCount(length: number): string {
  return length < 1000 ? `${length} chars` : `${(length / 1000).toFixed(1)}k chars`;
}

export function composePromptInput(value: string, pastedBlocks: readonly string[]): string {
  const parts = [value, ...pastedBlocks.map((block, index) => `[PASTED BLOCK ${index + 1}]\n${block}`)]
    .filter((part) => part.trim().length > 0);
  return parts.join('\n\n');
}

export function isSlashCommandInput(value: string): boolean {
  return /^\/[a-z][a-z-]*$/i.test(value.trim());
}

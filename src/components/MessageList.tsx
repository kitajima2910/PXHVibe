import React, {useEffect, useRef, useState} from 'react';
import {Box, Text, measureElement, useInput, type DOMElement} from 'ink';
import type {Message} from '../types/message.js';
import {FormattedText} from './FormattedText.js';
import {DiffView} from './DiffView.js';
import {ImageThumbnail} from './ImageThumbnail.js';
import {parseTerminalMouse} from '../utils/mouse.js';

interface MessageListProps {
  messages: readonly Message[];
}

export const scrollbarWidth = 4;

export function MessageList({messages}: MessageListProps): React.JSX.Element {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [trackHeight, setTrackHeight] = useState(1);
  const isDragging = useRef(false);
  const viewportRef = useRef<DOMElement>(null);

  useEffect(() => {
    setScrollOffset(0);
  }, [messages.length]);

  useEffect(() => {
    if (viewportRef.current === null) return;
    const measuredHeight = Math.max(1, measureElement(viewportRef.current).height);
    setTrackHeight((current) => current === measuredHeight ? current : measuredHeight);
  }, [messages.length, scrollOffset]);

  // Scroll in message units. Terminal rows and message counts are different
  // units (one message can span many rows), so trackHeight must not clamp the
  // history range.
  const maxOffset = Math.max(0, messages.length - 1);
  const scrollBy = (amount: number): void => {
    setScrollOffset((current) => Math.max(0, Math.min(maxOffset, current + amount)));
  };

  const scrollFromMouseY = (mouseY: number): void => {
    if (viewportRef.current === null || maxOffset === 0) return;
    const metrics = measureElement(viewportRef.current);
    const relativeY = Math.max(0, Math.min(metrics.height - 1, mouseY - metrics.y));
    const ratio = metrics.height <= 1 ? 1 : relativeY / (metrics.height - 1);
    setScrollOffset(Math.round((1 - ratio) * maxOffset));
  };

  useInput((input, key) => {
    const mouse = parseTerminalMouse(input);
    if (mouse !== undefined) {
      if (viewportRef.current !== null) {
        const metrics = measureElement(viewportRef.current);
        const insideViewport = mouse.x >= metrics.x && mouse.x < metrics.x + metrics.width
          && mouse.y >= metrics.y && mouse.y < metrics.y + metrics.height;
        if (insideViewport && mouse.button === 'wheel-up') scrollBy(1);
        if (insideViewport && mouse.button === 'wheel-down') scrollBy(-1);
        const onScrollbar = insideViewport && mouse.x >= metrics.x + metrics.width - scrollbarWidth;
        if (mouse.button === 'left' && mouse.action === 'press' && onScrollbar) {
          isDragging.current = true;
          scrollFromMouseY(mouse.y);
        } else if (mouse.button === 'left' && mouse.action === 'move' && isDragging.current) {
          scrollFromMouseY(mouse.y);
        } else if (mouse.action === 'release') {
          isDragging.current = false;
        }
      }
      return;
    }
    if (key.pageUp) {
      scrollBy(4);
      return;
    }
    if (key.pageDown) {
      scrollBy(-4);
    }
  });

  // Keep all messages up to the current history position. The viewport clips
  // excess content from the top while justifyContent="flex-end" anchors the
  // selected message at the bottom. Increasing the offset therefore removes
  // newer messages and reveals older history, regardless of message height.
  const visibleMessages = messages.slice(0, messages.length - scrollOffset);

  return (
    <Box
      flexDirection="column"
      paddingX={1}
      minHeight={0}
      flexBasis={0}
      flexGrow={1}
      overflow="hidden"
    >
      <Box ref={viewportRef} flexDirection="row" flexBasis={0} flexGrow={1} overflow="hidden">
        <Box
          flexDirection="column"
          justifyContent="flex-end"
          flexBasis={0}
          flexGrow={1}
          overflow="hidden"
        >
          {visibleMessages.map((message) => (
            <MessageCard key={message.id} message={message} />
          ))}
        </Box>
        <Box width={scrollbarWidth} flexDirection="column" flexShrink={0}>
          {buildScrollbar(trackHeight, messages.length, scrollOffset).map((character, index) => (
            <Text key={index} color={character === '┃' ? 'magenta' : '#484f58'} dimColor={character !== '┃'}>
              {character === '┃' ? ' ██ ' : ' ┊┊ '}
            </Text>
          ))}
        </Box>
      </Box>
      {scrollOffset > 0 && (
        <Box gap={1}>
          <Text bold color="magenta">HISTORY</Text>
          <Text dimColor>{scrollOffset}/{maxOffset}</Text>
          <Text color="gray">· cuộn xuống hoặc PageDown để về mới nhất</Text>
        </Box>
      )}
    </Box>
  );
}

export function buildScrollbar(height: number, messageCount: number, scrollOffset: number): string[] {
  const safeHeight = Math.max(1, height);
  if (messageCount <= 1) return Array.from({length: safeHeight}, () => '┊');
  // Keep the handle large enough to grab while avoiding a full-height color
  // column. About 25% of the track works well across common terminal sizes.
  const thumbSize = Math.min(safeHeight, Math.max(2, Math.min(8, Math.round(safeHeight * 0.25))));
  const maxTop = safeHeight - thumbSize;
  const maxOffset = messageCount - 1;
  const thumbTop = maxTop - Math.round(Math.min(maxOffset, scrollOffset) / maxOffset * maxTop);
  return Array.from(
    {length: safeHeight},
    (_, index) => index >= thumbTop && index < thumbTop + thumbSize ? '┃' : '┊',
  );
}

function MessageCard({message}: {message: Message}): React.JSX.Element {
  if (message.role === 'system') {
    const color = getSystemMessageColor(message);
    const isError = message.tone === 'error';
    return (
      <Box paddingLeft={2} marginTop={1} marginBottom={1} flexShrink={0}>
        <Box gap={1}>
          <Text bold color={isError ? 'red' : 'cyan'}>{isError ? '✖' : '↳'}</Text>
          <Text bold={isError} color={color}>{message.content}</Text>
        </Box>
      </Box>
    );
  }

  const isUser = message.role === 'user';
  return (
    <Box
      flexDirection="column"
      marginTop={1}
      marginBottom={1}
      flexShrink={0}
    >
      <Box gap={1}>
        <Text bold color={isUser ? 'magenta' : 'cyan'}>●</Text>
        <Text bold color={isUser ? 'magenta' : 'cyan'}>{isUser ? 'YOU' : 'PXH'}</Text>
        <Text dimColor>{isUser ? 'target' : 'response'}</Text>
        <Text dimColor>·</Text>
        <Text dimColor>{formatTime(message.createdAt)}</Text>
      </Box>
      {message.attachments !== undefined && message.attachments.length > 0 && (
        <Box paddingLeft={2}>{message.attachments.map((image) => <ImageThumbnail key={image.path} image={image} />)}</Box>
      )}
      <Box paddingLeft={2}>
        <FormattedText content={message.content} accent={isUser ? 'magenta' : 'cyan'} />
      </Box>
      {message.diff !== undefined && message.diff.length > 0 && (
        <Box paddingLeft={2}>
          <DiffView content={message.diff} />
        </Box>
      )}
    </Box>
  );
}

export function getSystemMessageColor(message: Message): 'red' | 'gray' {
  return message.tone === 'error' ? 'red' : 'gray';
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
}

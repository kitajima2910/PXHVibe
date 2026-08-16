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
        const onScrollbar = mouse.x >= metrics.x + metrics.width - 1;
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

  const visibleMessages = scrollOffset === 0
    ? messages
    : messages.slice(0, Math.max(1, messages.length - scrollOffset));

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
        <Box width={1} flexDirection="column" flexShrink={0}>
          {buildScrollbar(trackHeight, messages.length, scrollOffset).map((character, index) => (
            <Text key={index} color={character === '█' ? 'green' : 'gray'}>{character}</Text>
          ))}
        </Box>
      </Box>
      {scrollOffset > 0 && (
        <Text color="magenta">↑ HISTORY · PageDown để về hội thoại mới nhất</Text>
      )}
    </Box>
  );
}

export function buildScrollbar(height: number, messageCount: number, scrollOffset: number): string[] {
  const safeHeight = Math.max(1, height);
  if (messageCount <= 1) return Array.from({length: safeHeight}, () => '│');
  const visibleEstimate = Math.max(1, Math.floor(safeHeight / 3));
  const thumbSize = Math.max(1, Math.min(
    safeHeight,
    Math.round(safeHeight * Math.min(1, visibleEstimate / messageCount)),
  ));
  const maxTop = safeHeight - thumbSize;
  const maxOffset = messageCount - 1;
  const thumbTop = maxTop - Math.round(Math.min(maxOffset, scrollOffset) / maxOffset * maxTop);
  return Array.from(
    {length: safeHeight},
    (_, index) => index >= thumbTop && index < thumbTop + thumbSize ? '█' : '│',
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

import React, {useEffect, useState} from 'react';
import {Box, Text, useInput} from 'ink';
import type {Message} from '../types/message.js';
import {FormattedText} from './FormattedText.js';
import {ImageThumbnail} from './ImageThumbnail.js';

interface MessageListProps {
  messages: readonly Message[];
}

export function MessageList({messages}: MessageListProps): React.JSX.Element {
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    setScrollOffset(0);
  }, [messages.length]);

  useInput((_input, key) => {
    if (key.pageUp) {
      setScrollOffset((current) => Math.min(Math.max(0, messages.length - 1), current + 4));
      return;
    }
    if (key.pageDown) {
      setScrollOffset((current) => Math.max(0, current - 4));
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
      {scrollOffset > 0 && (
        <Text color="yellow">↑ HISTORY · PageDown để về hội thoại mới nhất</Text>
      )}
    </Box>
  );
}

function MessageCard({message}: {message: Message}): React.JSX.Element {
  if (message.role === 'system') {
    return (
      <Box paddingX={1} flexShrink={0}>
        <Text color="gray"><Text color="green">↳</Text>{' '}{message.content}</Text>
      </Box>
    );
  }

  const isUser = message.role === 'user';
  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderTop={false}
      borderRight={false}
      borderBottom={false}
      borderColor={isUser ? 'yellow' : 'green'}
      paddingLeft={1}
      marginTop={1}
      flexShrink={0}
    >
      <Box gap={1}>
        <Text bold inverse color={isUser ? 'yellow' : 'green'}>
          {' '}{isUser ? 'YOU' : 'PXH'}{' '}
        </Text>
        <Text dimColor>{isUser ? 'target' : 'response'} · {formatTime(message.createdAt)}</Text>
      </Box>
      {message.attachments !== undefined && message.attachments.length > 0 && (
        <Box>{message.attachments.map((image) => <ImageThumbnail key={image.path} image={image} />)}</Box>
      )}
      <FormattedText content={message.content} accent={isUser ? 'yellow' : 'green'} />
    </Box>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
}

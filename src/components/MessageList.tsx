import React from 'react';
import {Box, Text} from 'ink';
import type {Message} from '../types/message.js';
import {FormattedText} from './FormattedText.js';

interface MessageListProps {
  messages: readonly Message[];
}

export function MessageList({messages}: MessageListProps): React.JSX.Element {
  return (
    <Box flexDirection="column" paddingX={1} minHeight={5}>
      {messages.map((message) => <MessageCard key={message.id} message={message} />)}
    </Box>
  );
}

function MessageCard({message}: {message: Message}): React.JSX.Element {
  if (message.role === 'system') {
    return (
      <Box paddingX={1}>
        <Text color="gray"><Text color="green">◆ EVENT</Text>{'  '}{message.content}</Text>
      </Box>
    );
  }

  const isUser = message.role === 'user';
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={isUser ? 'yellow' : 'green'}
      paddingX={1}
      marginTop={1}
    >
      <Box justifyContent="space-between">
        <Text bold color={isUser ? 'yellow' : 'green'}>
          {isUser ? 'YOU  /  TARGET' : 'PXHVIBE  /  OUTPUT'}
        </Text>
        <Text dimColor>{formatTime(message.createdAt)}</Text>
      </Box>
      <FormattedText content={message.content} accent={isUser ? 'yellow' : 'green'} />
    </Box>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
}

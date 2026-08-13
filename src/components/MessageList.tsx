import React from 'react';
import {Box, Text} from 'ink';
import type {Message} from '../types/message.js';

interface MessageListProps {
  messages: readonly Message[];
}

const roleLabels: Record<Message['role'], string> = {
  user: 'You',
  assistant: 'Assistant',
  system: 'System',
};

export function MessageList({messages}: MessageListProps): React.JSX.Element {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="green" paddingX={1} minHeight={5}>
      {messages.map((message) => (
        <Text key={message.id}>
          <Text bold color={message.role === 'system' ? 'gray' : 'green'}>
            {'> '}{roleLabels[message.role]}:
          </Text>{' '}
          {message.content}
        </Text>
      ))}
    </Box>
  );
}

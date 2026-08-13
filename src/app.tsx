import React, {useState} from 'react';
import {Box} from 'ink';
import {Footer} from './components/Footer.js';
import {Header} from './components/Header.js';
import {MessageList} from './components/MessageList.js';
import {PromptInput} from './components/PromptInput.js';
import type {Message} from './types/message.js';

const initialMessage: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Xin chào! Tôi có thể giúp bạn đọc và chỉnh sửa project.',
  createdAt: new Date(),
};

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function App(): React.JSX.Element {
  const [messages, setMessages] = useState<Message[]>([initialMessage]);

  const handleSubmit = (content: string): void => {
    const message: Message = {
      id: createMessageId(),
      role: 'user',
      content,
      createdAt: new Date(),
    };

    setMessages((currentMessages) => [...currentMessages, message]);
  };

  return (
    <Box flexDirection="column">
      <Header workingDirectory={process.cwd()} />
      <MessageList messages={messages} />
      <PromptInput onSubmit={handleSubmit} />
      <Footer />
    </Box>
  );
}

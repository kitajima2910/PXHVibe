import React, {useState} from 'react';
import {Box} from 'ink';
import {Footer} from './components/Footer.js';
import {Header} from './components/Header.js';
import {MessageList} from './components/MessageList.js';
import {PromptInput} from './components/PromptInput.js';
import type {AIProvider} from './providers/AIProvider.js';
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

interface AppProps {
  provider: AIProvider;
}

type AppStatus = 'Ready' | 'Thinking...' | 'Error';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Provider đã gặp lỗi không xác định.';
}

export function App({provider}: AppProps): React.JSX.Element {
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [status, setStatus] = useState<AppStatus>('Ready');
  const [isBusy, setIsBusy] = useState(false);

  const handleSubmit = async (content: string): Promise<void> => {
    if (isBusy) {
      return;
    }

    const message: Message = {
      id: createMessageId(),
      role: 'user',
      content,
      createdAt: new Date(),
    };

    setMessages((currentMessages) => [...currentMessages, message]);
    setIsBusy(true);
    setStatus('Thinking...');

    try {
      const response = await provider.sendMessage(content, {cwd: process.cwd()});
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: 'assistant',
          content: response.content,
          createdAt: new Date(),
        },
      ]);
      setStatus('Ready');
    } catch (error: unknown) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: 'system',
          content: getErrorMessage(error),
          createdAt: new Date(),
        },
      ]);
      setStatus('Error');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <Box flexDirection="column">
      <Header
        workingDirectory={process.cwd()}
        providerName={provider.name}
        status={status}
      />
      <MessageList messages={messages} />
      <PromptInput
        onSubmit={(content) => void handleSubmit(content)}
        onExit={() => provider.cancel()}
        isBusy={isBusy}
      />
      <Footer />
    </Box>
  );
}

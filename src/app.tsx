import React, {useState} from 'react';
import {Box} from 'ink';
import {Footer} from './components/Footer.js';
import {Header} from './components/Header.js';
import {MessageList} from './components/MessageList.js';
import {PromptInput} from './components/PromptInput.js';
import type {AIProvider} from './providers/AIProvider.js';
import type {Message} from './types/message.js';
import type {AgentEvent} from './agent/types.js';
import {ModePicker} from './components/ModePicker.js';
import {modes, type PXHMode} from './modes.js';
import {createProvider} from './providers/createProvider.js';
import {createCustomProvider} from './providers/createProvider.js';
import {CustomApiSetup} from './components/CustomApiSetup.js';
import type {CustomApiConfig} from './providers/CustomAgentProvider.js';
import {buildAgentPrompt} from './utils/agentPrompt.js';
import {Banner} from './components/Banner.js';

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
  const [currentProvider, setCurrentProvider] = useState(provider);
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [status, setStatus] = useState<AppStatus>('Ready');
  const [isBusy, setIsBusy] = useState(false);
  const [isModePickerOpen, setIsModePickerOpen] = useState(false);
  const [isCustomSetupOpen, setIsCustomSetupOpen] = useState(false);

  const handleSubmit = async (content: string): Promise<void> => {
    if (isBusy) {
      return;
    }

    const command = content.toLowerCase();
    if (command === '/models') {
      setIsModePickerOpen(true);
      return;
    }

    if (command === '/help') {
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(),
        role: 'system',
        content: 'Lệnh: /models — chọn model; /help — trợ giúp.',
        createdAt: new Date(),
      }]);
      return;
    }

    if (command.startsWith('/')) {
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(),
        role: 'system',
        content: `Lệnh không hợp lệ: ${content}. Gõ /help để xem danh sách lệnh.`,
        createdAt: new Date(),
      }]);
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
    const responseMessageId = createMessageId();
    let hasStreamedResponse = false;

    const handleAgentEvent = (event: AgentEvent): void => {
      if (event.type === 'text_delta') {
        hasStreamedResponse = true;
        setMessages((currentMessages) => {
          const existing = currentMessages.find((item) => item.id === responseMessageId);
          if (existing === undefined) {
            return [...currentMessages, {
              id: responseMessageId,
              role: 'assistant',
              content: event.content,
              createdAt: new Date(),
            }];
          }
          return currentMessages.map((item) =>
            item.id === responseMessageId
              ? {...item, content: item.content + event.content}
              : item,
          );
        });
        return;
      }

      if (event.type === 'activity') {
        setMessages((currentMessages) => [...currentMessages, {
          id: createMessageId(),
          role: 'system',
          content: event.content,
          createdAt: new Date(),
        }]);
        return;
      }

      const activity = event.type === 'tool_start'
        ? `Đang chạy ${event.toolName}...`
        : `${event.toolName}: ${event.summary}`;
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(),
        role: 'system',
        content: activity,
        createdAt: new Date(),
      }]);
    };

    try {
      const response = await currentProvider.sendMessage(buildAgentPrompt(content), {
        cwd: process.cwd(),
        onEvent: handleAgentEvent,
      });
      if (!hasStreamedResponse) {
        setMessages((currentMessages) => [...currentMessages, {
          id: responseMessageId,
          role: 'assistant',
          content: response.content,
          createdAt: new Date(),
        }]);
      }
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

  const handleModeSelect = (mode: PXHMode): void => {
    if (mode.provider === 'custom') {
      setIsModePickerOpen(false);
      setIsCustomSetupOpen(true);
      return;
    }
    currentProvider.cancel();
    const nextProvider = createProvider(mode.provider, mode.model);
    setCurrentProvider(nextProvider);
    setStatus('Ready');
    setIsModePickerOpen(false);
    setMessages((currentMessages) => [...currentMessages, {
      id: createMessageId(),
      role: 'system',
      content: `Đã chuyển sang ${mode.label}.`,
      createdAt: new Date(),
    }]);
  };

  const handleCustomSetup = (config: CustomApiConfig): void => {
    currentProvider.cancel();
    const nextProvider = createCustomProvider(config);
    setCurrentProvider(nextProvider);
    setStatus('Ready');
    setIsCustomSetupOpen(false);
    setMessages((currentMessages) => [...currentMessages, {
      id: createMessageId(),
      role: 'system',
      content: `Đã kết nối Custom API với model ${config.model}.`,
      createdAt: new Date(),
    }]);
  };

  return (
    <Box flexDirection="column">
      <Banner />
      <Header
        workingDirectory={process.cwd()}
        providerName={currentProvider.name}
        status={status}
      />
      <MessageList messages={messages} />
      {isCustomSetupOpen ? (
        <CustomApiSetup
          onComplete={handleCustomSetup}
          onCancel={() => setIsCustomSetupOpen(false)}
        />
      ) : isModePickerOpen ? (
        <ModePicker
          modes={modes}
          onSelect={handleModeSelect}
          onCancel={() => setIsModePickerOpen(false)}
        />
      ) : (
        <PromptInput
          onSubmit={(content) => void handleSubmit(content)}
          onExit={() => currentProvider.cancel()}
          isBusy={isBusy}
        />
      )}
      <Footer />
    </Box>
  );
}

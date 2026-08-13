import React, {useState} from 'react';
import {Box, useStdout} from 'ink';
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
import {agents, getAgent, routeAgent, type PXHAgent, type PXHAgentId} from './agents.js';
import {AgentPicker} from './components/AgentPicker.js';
import {sanitizeOutputBranding, StreamingBrandSanitizer} from './utils/outputBranding.js';
import type {ImageAttachment} from './types/attachment.js';
import {pasteImageFromClipboard, removeTemporaryImage} from './utils/imageClipboard.js';
import {copyTextToClipboard} from './utils/clipboard.js';
import {collapsePastedBlocksForDisplay} from './utils/pastedText.js';

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
  const {stdout} = useStdout();
  const [currentProvider, setCurrentProvider] = useState(provider);
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [status, setStatus] = useState<AppStatus>('Ready');
  const [isBusy, setIsBusy] = useState(false);
  const [isModePickerOpen, setIsModePickerOpen] = useState(false);
  const [isCustomSetupOpen, setIsCustomSetupOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<PXHAgentId>('auto');
  const [activeAgent, setActiveAgent] = useState<PXHAgent>(getAgent('auto'));
  const [isAgentPickerOpen, setIsAgentPickerOpen] = useState(false);
  const [pendingImages, setPendingImages] = useState<ImageAttachment[]>([]);
  const [isPastingImage, setIsPastingImage] = useState(false);

  const handlePasteImage = async (): Promise<void> => {
    if (isBusy || isPastingImage) return;
    if (pendingImages.length >= 4) {
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(),
        role: 'system',
        content: 'Mỗi TARGET hỗ trợ tối đa 4 ảnh.',
        createdAt: new Date(),
      }]);
      return;
    }

    setIsPastingImage(true);
    try {
      const image = await pasteImageFromClipboard();
      setPendingImages((current) => [...current, image]);
    } catch (error: unknown) {
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(),
        role: 'system',
        content: getErrorMessage(error),
        createdAt: new Date(),
      }]);
    } finally {
      setIsPastingImage(false);
    }
  };

  const handleRemoveLastImage = (): void => {
    setPendingImages((current) => {
      const image = current.at(-1);
      if (image !== undefined) void removeTemporaryImage(image);
      return current.slice(0, -1);
    });
  };

  const handleCopyLastResponse = async (): Promise<void> => {
    const response = [...messages].reverse().find((message) => message.role === 'assistant');
    if (response === undefined) return;
    try {
      await copyTextToClipboard(response.content);
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system', content: 'Đã copy response gần nhất.', createdAt: new Date(),
      }]);
    } catch (error: unknown) {
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system', content: getErrorMessage(error), createdAt: new Date(),
      }]);
    }
  };

  const handleSubmit = async (content: string): Promise<void> => {
    if (isBusy) {
      return;
    }

    const command = content.toLowerCase();
    if (command === '/models') {
      setIsModePickerOpen(true);
      return;
    }

    if (command === '/agents') {
      setIsAgentPickerOpen(true);
      return;
    }

    if (command === '/help') {
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(),
        role: 'system',
        content: 'Lệnh: /models — chọn model; /agents — chọn specialist; /paste — dán ảnh; /copy — copy response; /help — trợ giúp.',
        createdAt: new Date(),
      }]);
      return;
    }

    if (command === '/copy') {
      await handleCopyLastResponse();
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

    const routedAgent = routeAgent(selectedAgentId, content);
    const requestImages = pendingImages;
    setPendingImages([]);
    const message: Message = {
      id: createMessageId(),
      role: 'user',
      content: collapsePastedBlocksForDisplay(content),
      ...(requestImages.length === 0 ? {} : {attachments: requestImages}),
      createdAt: new Date(),
    };

    setMessages((currentMessages) => [...currentMessages, message, {
      id: createMessageId(),
      role: 'system',
      content: `Economy Router → ${routedAgent.label}`,
      createdAt: new Date(),
    }]);
    setIsBusy(true);
    setStatus('Thinking...');
    const responseMessageId = createMessageId();
    let hasStreamedResponse = false;
    const streamSanitizer = new StreamingBrandSanitizer();

    const appendAssistantContent = (nextContent: string): void => {
      if (nextContent.length === 0) {
        return;
      }

      setMessages((currentMessages) => {
        const existing = currentMessages.find((item) => item.id === responseMessageId);
        if (existing === undefined) {
          return [...currentMessages, {
            id: responseMessageId,
            role: 'assistant',
            content: nextContent,
            createdAt: new Date(),
          }];
        }
        return currentMessages.map((item) =>
          item.id === responseMessageId
            ? {...item, content: item.content + nextContent}
            : item,
        );
      });
    };

    const handleAgentEvent = (event: AgentEvent): void => {
      if (event.type === 'text_delta') {
        hasStreamedResponse = true;
        appendAssistantContent(streamSanitizer.push(event.content));
        return;
      }

      if (event.type === 'activity') {
        setMessages((currentMessages) => [...currentMessages, {
          id: createMessageId(),
          role: 'system',
          content: sanitizeOutputBranding(event.content),
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
        content: sanitizeOutputBranding(activity),
        createdAt: new Date(),
      }]);
    };

    try {
      const response = await currentProvider.sendMessage(buildAgentPrompt(content, routedAgent), {
        cwd: process.cwd(),
        ...(requestImages.length === 0 ? {} : {attachments: requestImages}),
        onEvent: handleAgentEvent,
      });
      if (hasStreamedResponse) {
        appendAssistantContent(streamSanitizer.flush());
      } else {
        appendAssistantContent(sanitizeOutputBranding(response.content));
      }
      setStatus('Ready');
    } catch (error: unknown) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: 'system',
          content: sanitizeOutputBranding(getErrorMessage(error)),
          createdAt: new Date(),
        },
      ]);
      setStatus('Error');
    } finally {
      await Promise.all(requestImages.map(removeTemporaryImage));
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

  const handleAgentSelect = (agent: PXHAgent): void => {
    setSelectedAgentId(agent.id);
    setActiveAgent(agent);
    setIsAgentPickerOpen(false);
    setMessages((currentMessages) => [...currentMessages, {
      id: createMessageId(),
      role: 'system',
      content: agent.id === 'auto'
        ? 'Đã bật Economy Router tự động.'
        : `Đã khóa specialist: ${agent.label}.`,
      createdAt: new Date(),
    }]);
  };

  return (
    <Box flexDirection="column" height={stdout.rows}>
      <Banner />
      <Header
        workingDirectory={process.cwd()}
        providerName={currentProvider.name}
        agentLabel={activeAgent.label}
        status={status}
      />
      <MessageList messages={messages} />
      {isAgentPickerOpen ? (
        <AgentPicker
          agents={agents}
          onSelect={handleAgentSelect}
          onCancel={() => setIsAgentPickerOpen(false)}
        />
      ) : isCustomSetupOpen ? (
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
          onExit={() => {
            currentProvider.cancel();
            for (const image of pendingImages) void removeTemporaryImage(image);
          }}
          isBusy={isBusy || isPastingImage}
          attachments={pendingImages}
          onPasteImage={() => void handlePasteImage()}
          onRemoveLastImage={handleRemoveLastImage}
          onCopy={() => void handleCopyLastResponse()}
        />
      )}
      <Footer />
    </Box>
  );
}

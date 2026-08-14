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
import {checkFreeModelHealth, isModelHealthFresh, type ModelHealthReport} from './utils/modelHealth.js';

const initialMessage: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'PXHVibe đã sẵn sàng. Hãy mô tả tính năng, lỗi hoặc ý tưởng bạn muốn triển khai.',
  createdAt: new Date(),
};

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

interface AppProps {
  provider: AIProvider;
  checkModels?: typeof checkFreeModelHealth;
}

type AppStatus = 'Ready' | 'Thinking...' | 'Error';

export function getErrorMessage(error: unknown, hasImages = false): string {
  const message = error instanceof Error ? error.message : 'Provider đã gặp lỗi không xác định.';
  if (isImageUnsupportedError(message, hasImages)) {
    return 'MODEL KHÔNG HỖ TRỢ HÌNH ẢNH · Hãy bỏ ảnh hoặc chọn model vision khác bằng /models.';
  }
  if (isModelLimitError(message)) {
    return 'MODEL ĐÃ HẾT GIỚI HẠN · Hãy chờ quota được làm mới hoặc chọn model khác bằng /models.';
  }
  if (
    message.includes('AGENT ROLE:')
    || message.includes('AGENT MODE:')
    || (message.includes('IDENTITY:') && message.includes('TARGET:'))
  ) {
    return 'Model không thể xử lý TARGET này. Hãy thử lại hoặc chọn model khác bằng /models.';
  }
  return message;
}

export function isImageUnsupportedError(message: string, hasImages = false): boolean {
  const explicitImageError = /(?:(?:model|provider).*(?:does not|doesn't|cannot|can't).*(?:support|accept|process).*(?:image|vision)|(?:image|vision|multimodal).*(?:not supported|unsupported|not available|not enabled)|unsupported.*(?:image|vision)|không hỗ trợ.*(?:ảnh|hình ảnh|vision))/i;
  if (explicitImageError.test(message)) return true;
  return hasImages && /(?:(?:unsupported|not supported|does not support).*(?:input|content|media|attachment|file)|(?:input|content|media|attachment|file).*(?:unsupported|not supported)|(?:text[- ]only|only supports? text))/i.test(message);
}

export function isModelLimitError(message: string): boolean {
  return /(?:\b429\b|rate[_ -]?limit|usage[_ -]?limit|limit (?:reached|exceeded)|quota|too many requests|insufficient[_ -]?quota|credits? exhausted|no credits|hết (?:giới hạn|lượt|quota))/i.test(message);
}

const maxConversationContextCharacters = 24_000;

export function buildContextualTarget(messages: readonly Message[], currentTarget: string): string {
  const turns = messages
    .filter((message) => message.id !== 'welcome' && (message.role === 'user' || message.role === 'assistant'))
    .map((message) => `[${message.role === 'user' ? 'USER' : 'ASSISTANT'}]\n${message.contextContent ?? message.content}`)
    .filter((turn) => turn.trim().length > 0);
  if (turns.length === 0) return currentTarget;

  const selectedTurns: string[] = [];
  let remaining = maxConversationContextCharacters;
  for (let index = turns.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const turn = turns[index];
    if (turn === undefined) continue;
    const selected = turn.length <= remaining ? turn : turn.slice(turn.length - remaining);
    selectedTurns.unshift(selected);
    remaining -= selected.length;
  }

  return `BỐI CẢNH HỘI THOẠI TRƯỚC ĐÓ:\nHãy tiếp tục nhất quán và không yêu cầu người dùng lặp lại nội dung đã cung cấp.\n\n${selectedTurns.join('\n\n')}\n\nTARGET HIỆN TẠI:\n${currentTarget}`;
}

export function App({provider, checkModels = checkFreeModelHealth}: AppProps): React.JSX.Element {
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
  const [modelHealthReport, setModelHealthReport] = useState<ModelHealthReport>();
  const [isCheckingModelHealth, setIsCheckingModelHealth] = useState(false);

  const refreshModelHealth = async (): Promise<void> => {
    if (isCheckingModelHealth || isModelHealthFresh(modelHealthReport)) return;
    setIsCheckingModelHealth(true);
    try {
      const report = await checkModels(modes, process.cwd());
      setModelHealthReport(report);
      const recommended = modes.find((mode) => mode.id === report.recommendedModeId);
      const onlineCount = report.results.filter((result) => result.ok).length;
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(),
        role: 'system',
        ...(recommended === undefined ? {tone: 'error' as const} : {}),
        content: recommended === undefined
          ? 'Không có model free nào phản hồi. Hãy thử lại sau hoặc dùng Custom API.'
          : `Đề xuất ${recommended.label} · ${onlineCount}/${report.results.length} model free đang online.`,
        createdAt: new Date(),
      }]);
    } finally {
      setIsCheckingModelHealth(false);
    }
  };

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

  const showCommandList = (): void => {
    setMessages((currentMessages) => [...currentMessages, {
      id: createMessageId(),
      role: 'system',
      content: 'Lệnh: /models · /agents · /paste · /copy · /help',
      createdAt: new Date(),
    }]);
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
      void refreshModelHealth();
      return;
    }

    if (command === '/agents') {
      setIsAgentPickerOpen(true);
      return;
    }

    if (command === '/help') {
      showCommandList();
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

    const previousUserMessage = [...messages].reverse().find((item) => item.role === 'user');
    const routingTarget = `${previousUserMessage?.contextContent ?? previousUserMessage?.content ?? ''}\n${content}`;
    const routedAgent = routeAgent(selectedAgentId, routingTarget);
    const contextualTarget = buildContextualTarget(messages, content);
    const requestImages = pendingImages;
    setPendingImages([]);
    const message: Message = {
      id: createMessageId(),
      role: 'user',
      content: collapsePastedBlocksForDisplay(content, Math.max(20, (stdout.columns ?? 80) - 21)),
      contextContent: content,
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
      const response = await currentProvider.sendMessage(buildAgentPrompt(contextualTarget, routedAgent), {
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
          tone: 'error',
          content: sanitizeOutputBranding(getErrorMessage(error, requestImages.length > 0)),
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
          healthReport={modelHealthReport}
          isCheckingHealth={isCheckingModelHealth}
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
        />
      )}
      <Footer />
    </Box>
  );
}

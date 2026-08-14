import React, {useEffect, useRef, useState} from 'react';
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
import {Banner} from './components/Banner.js';
import {agents, getAgent, mergeAgentCatalog, routeAgent, type PXHAgent} from './agents.js';
import {AgentPicker} from './components/AgentPicker.js';
import {sanitizeOutputBranding} from './utils/outputBranding.js';
import type {ImageAttachment} from './types/attachment.js';
import {pasteImageFromClipboard, removeTemporaryImage} from './utils/imageClipboard.js';
import {copyTextToClipboard} from './utils/clipboard.js';
import {collapsePastedBlocksForDisplay} from './utils/pastedText.js';
import {checkFreeModelHealth, isModelHealthFresh, type ModelHealthReport} from './utils/modelHealth.js';
import {discoverOrchestration} from './orchestration/discovery.js';
import {routeOrchestration} from './orchestration/router.js';
import type {OrchestrationCatalog} from './orchestration/types.js';
import {preparePipeline, validateCapabilityPack, type PreparedPipeline} from './orchestration/pipeline.js';
import {appVersion} from './version.js';
import {runTeamPipeline, type TeamRunnerEvent} from './runtime/teamRunner.js';
import {makeSessionResumable, SessionStore, summarizeSession, type RuntimeSession} from './runtime/sessionStore.js';
import {commandDefinitions, detectProject, formatCommandList, getGitDiffSummary} from './runtime/commands.js';
import {getContextUsage, selectConversationContext} from './runtime/contextManager.js';

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
  orchestrationCatalog?: OrchestrationCatalog;
  workingDirectory?: string;
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

export function isCancellationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === 'AbortError' || /(?:aborted|abort|đã được hủy)/i.test(error.message);
}

export function buildContextualTarget(messages: readonly Message[], currentTarget: string): string {
  const turns = selectConversationContext(messages);
  if (turns.length === 0) return currentTarget;
  return `BỐI CẢNH HỘI THOẠI TRƯỚC ĐÓ:\nHãy tiếp tục nhất quán và không yêu cầu người dùng lặp lại nội dung đã cung cấp.\n\n${turns.join('\n\n')}\n\nTARGET HIỆN TẠI:\n${currentTarget}`;
}

export function buildRoutingTarget(messages: readonly Message[], currentTarget: string): string {
  if (!/^(?:tiếp tục|làm tiếp|sửa tiếp|triển khai tiếp|continue|go on)\b/iu.test(currentTarget.trim())) {
    return currentTarget;
  }
  const previousUserMessage = [...messages].reverse().find((item) => item.role === 'user');
  const previousTarget = previousUserMessage?.contextContent ?? previousUserMessage?.content;
  return previousTarget === undefined ? currentTarget : `${previousTarget}\n${currentTarget}`;
}

export function App({provider, checkModels = checkFreeModelHealth, orchestrationCatalog, workingDirectory = process.cwd()}: AppProps): React.JSX.Element {
  const {stdout} = useStdout();
  const [catalog] = useState(() => orchestrationCatalog ?? discoverOrchestration(workingDirectory));
  const availableAgents = mergeAgentCatalog(agents, catalog.agents);
  const bundledAgentCount = catalog.agents.filter((agent) => !agent.id.startsWith('project:')).length;
  const bundledSkillCount = catalog.skills.filter((skill) => skill.origin === 'bundled').length;
  const bundledWorkflowCount = catalog.workflows.filter((workflow) => workflow.origin === 'bundled').length;
  const projectAgentCount = catalog.agents.filter((agent) => agent.id.startsWith('project:')).length;
  const [currentProvider, setCurrentProvider] = useState(provider);
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [status, setStatus] = useState<AppStatus>('Ready');
  const [isBusy, setIsBusy] = useState(false);
  const [isModePickerOpen, setIsModePickerOpen] = useState(false);
  const [isCustomSetupOpen, setIsCustomSetupOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('auto');
  const [activeAgent, setActiveAgent] = useState<PXHAgent>(getAgent('auto'));
  const [isAgentPickerOpen, setIsAgentPickerOpen] = useState(false);
  const [pendingImages, setPendingImages] = useState<ImageAttachment[]>([]);
  const [isPastingImage, setIsPastingImage] = useState(false);
  const [modelHealthReport, setModelHealthReport] = useState<ModelHealthReport>();
  const [isCheckingModelHealth, setIsCheckingModelHealth] = useState(false);
  const [lastPipeline, setLastPipeline] = useState<PreparedPipeline>();
  const [runtimeSession, setRuntimeSession] = useState<RuntimeSession>();
  const resumeSessionRef = useRef<RuntimeSession | undefined>(undefined);
  const autoResumeStartedRef = useRef(false);
  const contextUsage = getContextUsage(messages);

  const refreshModelHealth = async (): Promise<void> => {
    if (isCheckingModelHealth || isModelHealthFresh(modelHealthReport)) return;
    setIsCheckingModelHealth(true);
    try {
      const report = await checkModels(modes, workingDirectory);
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
      content: `Lệnh (${commandDefinitions.length}): ${formatCommandList()}`,
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

    if (command === '/skills') {
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system',
        content: `Skills (${catalog.skills.length}): ${catalog.skills.map((skill) => skill.name).join(' · ')}`,
        createdAt: new Date(),
      }]);
      return;
    }

    if (command === '/workflows') {
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system',
        content: `Workflows (${catalog.workflows.length}): ${catalog.workflows.map((workflow) => workflow.name).join(' · ')}`,
        createdAt: new Date(),
      }]);
      return;
    }

    if (command === '/status') {
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system',
        content: `PXHVibe v${appVersion} · ${bundledAgentCount} agents · 4 tiers · ${bundledWorkflowCount} workflows · ${bundledSkillCount} skills · 6 contracts${projectAgentCount === 0 ? '' : ` · +${projectAgentCount} project agents`}`,
        createdAt: new Date(),
      }]);
      return;
    }

    if (command === '/pipeline') {
      const pipelineState = lastPipeline;
      const phases = runtimeSession?.steps.map((step) => `${step.phase}:${step.agentLabel}[${step.status}]`).join(' → ')
        ?? pipelineState?.state.steps.map((step) => `${step.phase}:${step.agent}`).join(' → ');
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system',
        content: phases === undefined ? 'Pipeline chưa có TARGET.' : `Pipeline ${pipelineState?.state.workflow ?? 'unknown'} · ${phases}`,
        createdAt: new Date(),
      }]);
      return;
    }

    if (command === '/validate') {
      const errors = validateCapabilityPack(bundledAgentCount, bundledWorkflowCount, bundledSkillCount);
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system', ...(errors.length === 0 ? {} : {tone: 'error' as const}),
        content: errors.length === 0 ? 'Capability pack hợp lệ · 10 agents · 4 tiers · 8 workflows · 50 skills · 6 contracts.' : errors.join(' '),
        createdAt: new Date(),
      }]);
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

    if (command === '/paste') {
      await handlePasteImage();
      return;
    }

    if (command === '/cancel') {
      currentProvider.cancel();
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system', content: 'Đã gửi yêu cầu hủy phase hiện tại.', createdAt: new Date(),
      }]);
      return;
    }

    if (command === '/retry') {
      const previous = [...messages].reverse().find((message) => message.role === 'user');
      if (previous === undefined) {
        setMessages((currentMessages) => [...currentMessages, {
          id: createMessageId(), role: 'system', content: 'Chưa có TARGET để retry.', createdAt: new Date(),
        }]);
        return;
      }
      await handleSubmit(previous.contextContent ?? previous.content);
      return;
    }

    if (command === '/new') {
      resumeSessionRef.current = undefined;
      setRuntimeSession(undefined);
      setLastPipeline(undefined);
      setMessages([initialMessage]);
      setStatus('Ready');
      return;
    }

    if (command === '/resume') {
      const stored = await new SessionStore(workingDirectory).load();
      if (stored === undefined || stored.status === 'pass') {
        setMessages((currentMessages) => [...currentMessages, {
          id: createMessageId(), role: 'system',
          content: stored === undefined ? 'Không có checkpoint để resume.' : 'Session gần nhất đã hoàn tất.',
          createdAt: new Date(),
        }]);
        return;
      }
      resumeSessionRef.current = makeSessionResumable(stored);
      await handleSubmit(stored.target);
      return;
    }

    if (command === '/session') {
      const stored = runtimeSession ?? await new SessionStore(workingDirectory).load();
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system',
        content: stored === undefined ? 'Chưa có runtime session.' : `Session ${stored.sessionId} · ${summarizeSession(stored)}`,
        createdAt: new Date(),
      }]);
      return;
    }

    if (command === '/context') {
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system',
        content: `Context ${contextUsage.percent}% · ~${contextUsage.estimatedTokens.toLocaleString('vi')} tokens · ${contextUsage.activeCharacters.toLocaleString('vi')}/24.000 chars${contextUsage.compacted ? ' · AUTO-COMPACT đang bật' : ''} · ${runtimeSession?.steps.filter((step) => step.output !== undefined).length ?? 0} phase outputs.`,
        createdAt: new Date(),
      }]);
      return;
    }

    if (command === '/detect') {
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system', content: detectProject(workingDirectory), createdAt: new Date(),
      }]);
      return;
    }

    if (command === '/doctor') {
      const errors = validateCapabilityPack(bundledAgentCount, bundledWorkflowCount, bundledSkillCount);
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system', ...(errors.length === 0 ? {} : {tone: 'error' as const}),
        content: errors.length === 0
          ? `Doctor OK · Node ${process.version} · ${currentProvider.name} · state ${new SessionStore(workingDirectory).path}`
          : `Doctor lỗi · ${errors.join(' ')}`,
        createdAt: new Date(),
      }]);
      return;
    }

    if (command === '/diff') {
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system', content: getGitDiffSummary(workingDirectory), createdAt: new Date(),
      }]);
      return;
    }

    if (command === '/history') {
      const stored = runtimeSession ?? await new SessionStore(workingDirectory).load();
      const history = stored?.steps.map((step) => `${step.phase}:${step.status}(${step.attempts})`).join(' → ');
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system', content: history ?? 'Chưa có phase history.', createdAt: new Date(),
      }]);
      return;
    }

    if (command === '/version') {
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system', content: `PXHVibe v${appVersion}`, createdAt: new Date(),
      }]);
      return;
    }

    if (command === '/about') {
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system',
        content: 'PXHVibe · Terminal coding team · Error404-Labs.Info.VN · Phạm Xuân Hoài.', createdAt: new Date(),
      }]);
      return;
    }

    if (command === '/clear') {
      setMessages([initialMessage]);
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

    const routingTarget = buildRoutingTarget(messages, content);
    const orchestrationRoute = routeOrchestration(routingTarget, catalog);
    const preferredAgentId = orchestrationRoute.workflow?.preferredAgentId;
    const resolvedPreferredAgentId = preferredAgentId === undefined
      ? undefined
      : availableAgents.some((agent) => agent.id === preferredAgentId)
        ? preferredAgentId
        : availableAgents.some((agent) => agent.id === `project:${preferredAgentId}`)
          ? `project:${preferredAgentId}`
          : undefined;
    const automaticAgentId = selectedAgentId === 'auto'
      ? resolvedPreferredAgentId ?? 'auto'
      : selectedAgentId;
    const routedAgent = routeAgent(automaticAgentId, routingTarget, availableAgents);
    const pendingResumeSession = resumeSessionRef.current;
    const contextualTarget = pendingResumeSession?.target ?? buildContextualTarget(messages, content);
    const pipeline = preparePipeline(contextualTarget, orchestrationRoute, routedAgent);
    const resumeSession = pendingResumeSession;
    resumeSessionRef.current = undefined;
    setLastPipeline(pipeline);
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

    const routeSummary = [
      `Agent → ${routedAgent.label}`,
      orchestrationRoute.workflow === undefined ? undefined : `Workflow → ${orchestrationRoute.workflow.name}${orchestrationRoute.confidence === undefined ? '' : ` (${Math.round(orchestrationRoute.confidence * 100)}%)`}`,
      orchestrationRoute.skills.length === 0 ? undefined : `Skills → ${orchestrationRoute.skills.map((skill) => skill.name).join(', ')}`,
      `Pipeline → ${pipeline.tasks.map((task) => task.phase).join('→')}`,
    ].filter((value): value is string => value !== undefined).join(' · ');
    setMessages((currentMessages) => [...currentMessages, message, {
      id: createMessageId(), role: 'system', content: routeSummary, createdAt: new Date(),
    }]);
    setIsBusy(true);
    setStatus('Thinking...');
    const responseMessageId = createMessageId();

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

    const handleTeamEvent = (event: TeamRunnerEvent): void => {
      const prefix = event.type === 'phase_pass' ? '✓'
        : event.type === 'phase_fail' ? '✖'
          : event.type === 'phase_retry' ? '↻'
            : event.type === 'checkpoint' ? '◇' : '▶';
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system',
        ...(event.type === 'phase_fail' ? {tone: 'error' as const} : {}),
        content: `${prefix} ${event.phase.toUpperCase()} · ${event.agentLabel} · ${event.message}`,
        createdAt: new Date(),
      }]);
    };

    try {
      const result = await runTeamPipeline({
        provider: currentProvider,
        cwd: workingDirectory,
        target: contextualTarget,
        route: orchestrationRoute,
        catalog,
        pipeline,
        agents: availableAgents,
        selectedAgent: routedAgent,
        ...(requestImages.length === 0 ? {} : {attachments: requestImages}),
        onAgentEvent: handleAgentEvent,
        onEvent: handleTeamEvent,
        ...(resumeSession === undefined ? {} : {resumeSession}),
      });
      setRuntimeSession(result.session);
      appendAssistantContent(sanitizeOutputBranding(result.content));
      setStatus('Ready');
    } catch (error: unknown) {
      const storedSession = await new SessionStore(workingDirectory).load();
      if (storedSession !== undefined) setRuntimeSession(storedSession);
      if (isCancellationError(error)) {
        setMessages((currentMessages) => [...currentMessages, {
          id: createMessageId(),
          role: 'system',
          content: 'Đã hủy task hiện tại.',
          createdAt: new Date(),
        }]);
        setStatus('Ready');
      } else {
        setMessages((currentMessages) => [...currentMessages, {
          id: createMessageId(),
          role: 'system',
          tone: 'error',
          content: sanitizeOutputBranding(getErrorMessage(error, requestImages.length > 0)),
          createdAt: new Date(),
        }]);
        setStatus('Error');
      }
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

  useEffect(() => {
    if (autoResumeStartedRef.current) return;
    autoResumeStartedRef.current = true;
    void (async () => {
      const stored = await new SessionStore(workingDirectory).load();
      if (stored === undefined || (stored.status !== 'fail' && stored.status !== 'running')) return;
      resumeSessionRef.current = makeSessionResumable(stored);
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system',
        content: `AUTO-RESUME · tiếp tục session ${stored.sessionId} từ checkpoint ${stored.currentIndex + 1}/${stored.steps.length}.`,
        createdAt: new Date(),
      }]);
      await handleSubmit(stored.target);
    })();
  }, []);

  return (
    <Box flexDirection="column" height={stdout.rows}>
      <Banner />
      <Header
        workingDirectory={workingDirectory}
        providerName={currentProvider.name}
        agentLabel={activeAgent.label}
        status={status}
        contextPercent={contextUsage.percent}
        contextCompacted={contextUsage.compacted}
      />
      <MessageList messages={messages} />
      {isAgentPickerOpen ? (
        <AgentPicker
          agents={availableAgents}
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
          onCancel={() => currentProvider.cancel()}
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

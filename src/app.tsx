import React, {useEffect, useRef, useState} from 'react';
import {Box, useStdout} from 'ink';
import {Footer} from './components/Footer.js';
import {Header} from './components/Header.js';
import {phaseTodoLabel, TodoStrip, type TodoItem} from './components/TodoStrip.js';
import {MessageList} from './components/MessageList.js';
import {PromptInput, type PromptDraft} from './components/PromptInput.js';
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
import {CatalogPicker, type CatalogPickerItem} from './components/CatalogPicker.js';
import {sanitizeOutputBranding, StreamingBrandSanitizer} from './utils/outputBranding.js';
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
import {makeSessionResumable, SessionStore, type RuntimeSession} from './runtime/sessionStore.js';
import {
  commandDefinitions, detectProject, formatCommandList, formatHistoryDetails,
  formatPipelineDetails, getGitDiffFull, getGitDiffSummary,
} from './runtime/commands.js';
import {getContextUsage, selectConversationContext} from './runtime/contextManager.js';
import {formatMCPStatus, MCPManager, type MCPServerStatus} from './mcp/MCPManager.js';

const initialMessage: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'PXHVibe đã sẵn sàng. Hãy mô tả tính năng, lỗi hoặc ý tưởng bạn muốn triển khai.',
  createdAt: new Date(),
};

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function skillPickerItems(catalog: OrchestrationCatalog): CatalogPickerItem[] {
  return catalog.skills.map((skill) => ({
    id: skill.id,
    label: skill.name,
    description: skill.description,
    meta: `${skill.origin} · ${skill.source}`,
    markdown: skill.instructions,
  }));
}

export function workflowPickerItems(catalog: OrchestrationCatalog): CatalogPickerItem[] {
  return catalog.workflows.map((workflow) => ({
    id: workflow.id,
    label: workflow.name,
    description: workflow.description,
    meta: `${workflow.steps.length} bước · agent ${workflow.preferredAgentId ?? 'auto'} · ${workflow.origin}`,
    markdown: workflow.instructions,
  }));
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

function formatDiffStatHeader(diff: string): string {
  const fileCount = diff.split(/\n(?=diff --git )/).filter((part) => part.trim().length > 0).length;
  const additions = (diff.match(/^\+(?!\+\+)/gm) ?? []).length;
  const deletions = (diff.match(/^-(?!--)/gm) ?? []).length;
  return `**GIT DIFF** · ${fileCount} file · +${additions} −${deletions}`;
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

export interface PhaseSummaryEntry {
  phase: string;
  agent: string;
  output: string;
}

export function formatPhaseSummary(entries: readonly PhaseSummaryEntry[], budget = 2_400): string {
  const visible = entries.filter((entry) => entry.output.trim().length > 0);
  if (visible.length === 0) return '';
  const lines = ['---', '**Tổng kết pipeline**'];
  let remaining = budget;
  for (const entry of visible) {
    const body = entry.output.trim().replace(/\r\n/g, '\n');
    const block = `\n**[${entry.phase.toUpperCase()} · ${entry.agent}]**\n${body}`;
    const selected = block.length <= remaining ? block : `${block.slice(0, Math.max(1, remaining - 3))}...`;
    lines.push(selected);
    remaining -= selected.length;
    if (remaining <= 0) break;
  }
  return lines.join('\n');
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
  const [catalogView, setCatalogView] = useState<'skills' | 'workflows'>();
  const [pendingImages, setPendingImages] = useState<ImageAttachment[]>([]);
  const [isPastingImage, setIsPastingImage] = useState(false);
  const [modelHealthReport, setModelHealthReport] = useState<ModelHealthReport>();
  const [isCheckingModelHealth, setIsCheckingModelHealth] = useState(false);
  const [lastPipeline, setLastPipeline] = useState<PreparedPipeline>();
  const [runtimeSession, setRuntimeSession] = useState<RuntimeSession>();
  const [busyStartedAt, setBusyStartedAt] = useState<number>();
  const [lastActivityAt, setLastActivityAt] = useState<number>();
  const [activityLabel, setActivityLabel] = useState('Đang khởi động worker...');
  const [phaseLabel, setPhaseLabel] = useState('khởi động');
  const [stickyTasks, setStickyTasks] = useState<TodoItem[]>([]);
  const [mcpManager] = useState(() => new MCPManager(workingDirectory));
  const [mcpServers, setMcpServers] = useState<readonly MCPServerStatus[]>([]);
  const mcpReadyRef = useRef<Promise<readonly MCPServerStatus[]> | undefined>(undefined);
  const resumeSessionRef = useRef<RuntimeSession | undefined>(undefined);
  const autoResumeStartedRef = useRef(false);
  const promptDraftRef = useRef<PromptDraft | undefined>(undefined);
  const responseMessageIdRef = useRef<string | undefined>(undefined);
  const streamedContentRef = useRef('');
  const streamingSanitizerRef = useRef<StreamingBrandSanitizer | undefined>(undefined);
  const lastToolKeyRef = useRef<string | undefined>(undefined);
  const contextUsage = getContextUsage(messages);

  const configureMCP = async (targetProvider: AIProvider, forceConnect = false): Promise<readonly MCPServerStatus[]> => {
    try {
      const statuses = forceConnect || targetProvider.setMCPTools !== undefined
        ? await mcpManager.refresh()
        : (await mcpManager.close(), mcpManager.load());
      targetProvider.setMCPTools?.(mcpManager.tools);
      setMcpServers([...statuses]);
      return statuses;
    } catch (error: unknown) {
      targetProvider.setMCPTools?.([]);
      const statuses: MCPServerStatus[] = [{
        name: 'config', state: 'error',
        error: error instanceof Error ? error.message : String(error),
      }];
      setMcpServers(statuses);
      return statuses;
    }
  };

  const ensureMCPReady = (targetProvider: AIProvider): Promise<readonly MCPServerStatus[]> => {
    mcpReadyRef.current ??= configureMCP(targetProvider).catch((err) => {
      mcpReadyRef.current = undefined;
      throw err;
    });
    return mcpReadyRef.current;
  };

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
      content: `LỆNH NHANH · ${commandDefinitions.length}\n${formatCommandList()}`,
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
      setCatalogView('skills');
      return;
    }

    if (command === '/workflows') {
      setCatalogView('workflows');
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

    if (command === '/mcp' || command === '/mcp refresh' || command === '/mcp doctor') {
      let refreshedStatuses: readonly MCPServerStatus[] | undefined;
      if (command !== '/mcp') {
        refreshedStatuses = await configureMCP(currentProvider, command === '/mcp doctor');
        mcpReadyRef.current = Promise.resolve(refreshedStatuses);
      }
      const statuses = command === '/mcp'
        ? (mcpServers.length === 0 ? mcpManager.load() : mcpServers)
        : refreshedStatuses ?? [];
      setMcpServers([...statuses]);
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system', content: formatMCPStatus(statuses), createdAt: new Date(),
      }]);
      return;
    }

    if (command === '/pipeline') {
      const pipelineState = lastPipeline;
      const phases = runtimeSession?.steps.map((step) => ({
        phase: step.phase, agent: step.agentLabel, status: step.status, attempts: step.attempts,
      })) ?? pipelineState?.state.steps.map((step) => ({
        phase: step.phase, agent: step.agent, status: step.status,
      }));
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system',
        content: phases === undefined
          ? 'Pipeline chưa có TARGET.'
          : formatPipelineDetails(runtimeSession?.workflowId ?? pipelineState?.state.workflow ?? 'unknown', phases),
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
      promptDraftRef.current = undefined;
      resumeSessionRef.current = undefined;
      setRuntimeSession(undefined);
      setLastPipeline(undefined);
      setStickyTasks([]);
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
      const active = stored?.steps[stored.currentIndex];
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system',
        content: stored === undefined
          ? 'Chưa có runtime session.'
          : [
            `SESSION · ${stored.sessionId}`,
            `Workflow  ${stored.workflowId} · ${stored.status}`,
            `Tiến độ   ${stored.steps.filter((step) => step.status === 'pass').length}/${stored.steps.length} phases`,
            active === undefined ? undefined : `Hiện tại  ${active.phase.toUpperCase()} · ${active.agentLabel}`,
          ].filter((line): line is string => line !== undefined).join('\n'),
        createdAt: new Date(),
      }]);
      return;
    }

    if (command === '/context') {
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system',
        content: [
          `CONTEXT · ${contextUsage.percent}%`,
          `Tokens    ~${contextUsage.estimatedTokens.toLocaleString('vi')}`,
          `Ký tự     ${contextUsage.activeCharacters.toLocaleString('vi')}/24.000`,
          `Bộ nhớ    ${contextUsage.compacted ? 'AUTO-COMPACT đang bật' : 'Chưa compact'} · ${runtimeSession?.steps.filter((step) => step.output !== undefined).length ?? 0} phase outputs`,
        ].join('\n'),
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
          ? [
            'DOCTOR · OK',
            `Node      ${process.version}`,
            `Provider  ${currentProvider.name}`,
            `State     ${new SessionStore(workingDirectory).path}`,
          ].join('\n')
          : ['DOCTOR · LỖI', ...errors.map((error) => `✖ ${error}`)].join('\n'),
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
      setMessages((currentMessages) => [...currentMessages, {
        id: createMessageId(), role: 'system',
        content: stored === undefined
          ? 'Chưa có phase history.'
          : formatHistoryDetails(stored.steps.map((step) => ({
            phase: step.phase, agent: step.agentLabel, status: step.status, attempts: step.attempts,
          }))),
        createdAt: new Date(),
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
      promptDraftRef.current = undefined;
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

    await ensureMCPReady(currentProvider);

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
    setStickyTasks(pipeline.tasks.map((task, index) => ({
      id: `${index}-${task.phase}`,
      label: phaseTodoLabel(task.phase, task.workflow),
      status: 'pending',
      agentLabel: task.agent,
    })));
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
    const startedAt = Date.now();
    setBusyStartedAt(startedAt);
    setLastActivityAt(startedAt);
    setActivityLabel('Đang chuẩn bị context và pipeline...');
    setPhaseLabel(`phase 1/${pipeline.tasks.length}`);
    const responseMessageId = createMessageId();
    responseMessageIdRef.current = responseMessageId;
    streamedContentRef.current = '';
    streamingSanitizerRef.current = new StreamingBrandSanitizer();

    const appendAssistantContent = (nextContent: string): void => {
      if (nextContent.length === 0) {
        return;
      }

      streamedContentRef.current += nextContent;
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
      setLastActivityAt(Date.now());
      if (event.type === 'text_delta') {
        const visibleDelta = streamingSanitizerRef.current?.push(event.content) ?? '';
        appendAssistantContent(visibleDelta);
        return;
      }

      if (event.type === 'activity') {
        const visibleActivity = sanitizeOutputBranding(event.content);
        setActivityLabel(visibleActivity);
        setStickyTasks((current) => current.map((task) => task.status === 'running'
          ? {...task, detail: visibleActivity}
          : task));
        return;
      }

      if (event.type === 'tool_start') {
        // Hiển thị tool call như block thu gọn trong transcript, không giấu.
        lastToolKeyRef.current = event.toolName;
        appendAssistantContent(sanitizeOutputBranding(`\n\`\`\`\n[${event.toolName}]\n`));
        return;
      }

      // tool_complete: cập nhật summary vào block tool vừa mở.
      const toolBlock = `\n\`\`\`\n[${event.toolName}]\n${event.summary}\n\`\`\``;
      const lastToolKey = lastToolKeyRef.current;
      if (lastToolKey === event.toolName) {
        // Gộp summary vào block tool_start liền trước.
        setMessages((currentMessages) => currentMessages.map((item) => {
          if (item.id !== responseMessageId || !item.content.endsWith(`[${lastToolKey}]\n`)) return item;
          return {...item, content: item.content + `${event.summary}\n\`\`\``};
        }));
        lastToolKeyRef.current = undefined;
        return;
      }
      appendAssistantContent(sanitizeOutputBranding(toolBlock));
    };

    const handleTeamEvent = (event: TeamRunnerEvent): void => {
      const phaseIndex = Math.max(0, pipeline.tasks.findIndex((task) => task.phase === event.phase));
      setLastActivityAt(Date.now());
      setPhaseLabel(`${event.phase.toUpperCase()} ${phaseIndex + 1}/${pipeline.tasks.length}`);
      setActivityLabel(event.message);
      setStickyTasks((current) => current.map((task, index) => {
        if (index !== phaseIndex) return task;
        const nextStatus = event.type === 'phase_pass' || event.type === 'checkpoint'
          ? 'pass'
          : event.type === 'phase_fail'
            ? 'fail'
            : 'running';
        return {
          ...task,
          status: nextStatus,
          agentLabel: event.agentLabel,
          attempt: event.attempt,
          detail: event.message,
        };
      }));
      if (event.type === 'phase_pass' && event.output !== undefined && event.output.trim().length > 0) {
        // Output phase hiện ngay trong luồng assistant, không tạo system message.
        appendAssistantContent(sanitizeOutputBranding(`\n\n**${event.phase.toUpperCase()} · ${event.agentLabel}**\n${event.output.trim()}`));
        return;
      }
      if (event.type === 'phase_fail') {
        setMessages((currentMessages) => [...currentMessages, {
          id: createMessageId(), role: 'system', tone: 'error',
          content: `✖ ${event.phase.toUpperCase()} · ${event.agentLabel} · ${event.message}`,
          createdAt: new Date(),
        }]);
      }
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
      const flushed = streamingSanitizerRef.current?.flush() ?? '';
      appendAssistantContent(flushed);
      const streamed = streamedContentRef.current;
      // Output phase cuối đã được stream qua text_delta (custom) hoặc đã hiện qua
      // phase_pass (free); chỉ append lại khi chưa xuất hiện.
      const lastOutput = result.content.trim();
      if (lastOutput.length > 0 && !streamed.includes(lastOutput)) {
        appendAssistantContent(sanitizeOutputBranding(`\n\n${lastOutput}`));
      }
      const diffResult = getGitDiffFull(workingDirectory);
      if (diffResult.ok && diffResult.content !== undefined) {
        // Gắn full diff vào response message để render kiểu git.
        const diffContent = diffResult.content;
        setMessages((currentMessages) => currentMessages.map((item) =>
          item.id === responseMessageId ? {...item, diff: diffContent} : item,
        ));
        appendAssistantContent(sanitizeOutputBranding(`\n\n${formatDiffStatHeader(diffContent)}`));
      } else if (!diffResult.ok) {
        const message = diffResult.message ?? '';
        if (!message.startsWith('Thư mục') && !message.startsWith('Không đọc được')) {
          appendAssistantContent(sanitizeOutputBranding(`\n\n${message}`));
        }
      }
      setStatus('Ready');
    } catch (error: unknown) {
      const storedSession = await new SessionStore(workingDirectory).load();
      if (storedSession !== undefined) setRuntimeSession(storedSession);
      if (isCancellationError(error)) {
        setStickyTasks((current) => current.map((task) => task.status === 'running'
          ? {...task, status: 'cancelled', detail: 'Đã dừng bởi người dùng.'}
          : task));
        setMessages((currentMessages) => [...currentMessages, {
          id: createMessageId(),
          role: 'system',
          content: 'Đã dừng lượt chạy. Các thay đổi đã ghi ra file được giữ nguyên.',
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
    mcpReadyRef.current = configureMCP(nextProvider);
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
    mcpReadyRef.current = configureMCP(nextProvider);
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
    void ensureMCPReady(currentProvider);
    return () => { void mcpManager.close(); };
  }, []);

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
      />
      <Box flexDirection="row" flexBasis={0} flexGrow={1} minHeight={0}>
        <Box flexDirection="column" flexBasis={0} flexGrow={4} minWidth={0}>
          <MessageList messages={messages} />
        </Box>
        <Box flexDirection="column" flexBasis={0} flexGrow={1} minWidth={20}>
          <TodoStrip tasks={stickyTasks} mcpServers={mcpServers} />
        </Box>
      </Box>
      {catalogView !== undefined ? (
        <CatalogPicker
          title={catalogView === 'skills' ? 'SKILLS' : 'WORKFLOWS'}
          items={catalogView === 'skills' ? skillPickerItems(catalog) : workflowPickerItems(catalog)}
          onClose={() => setCatalogView(undefined)}
        />
      ) : isAgentPickerOpen ? (
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
          onSubmit={(content, preservedDraft) => {
            promptDraftRef.current = preservedDraft;
            void handleSubmit(content);
          }}
          onCancel={() => currentProvider.cancel()}
          onExit={() => {
            currentProvider.cancel();
            for (const image of pendingImages) void removeTemporaryImage(image);
          }}
          isBusy={isBusy || isPastingImage}
          attachments={pendingImages}
          onPasteImage={() => void handlePasteImage()}
          onRemoveLastImage={handleRemoveLastImage}
          {...(busyStartedAt === undefined ? {} : {busyStartedAt})}
          {...(lastActivityAt === undefined ? {} : {lastActivityAt})}
          activityLabel={activityLabel}
          phaseLabel={phaseLabel}
          {...(promptDraftRef.current === undefined ? {} : {initialDraft: promptDraftRef.current})}
        />
      )}
      <Footer />
    </Box>
  );
}

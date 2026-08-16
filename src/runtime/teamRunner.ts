import type {PXHAgent} from '../agents.js';
import {getAgent} from '../agents.js';
import type {AgentEvent} from '../agent/types.js';
import type {OrchestrationCatalog, OrchestrationRoute} from '../orchestration/types.js';
import {agentIdForPhase, type PreparedPipeline} from '../orchestration/pipeline.js';
import {contractVersion, validateContract, type EventContract, type ResultContract, type ResponseContract, type TaskPhase} from '../orchestration/contracts.js';
import type {AIProvider} from '../providers/AIProvider.js';
import type {ImageAttachment} from '../types/attachment.js';
import {buildAgentPrompt} from '../utils/agentPrompt.js';
import {SessionStore, type RuntimeSession, type RuntimeStepState} from './sessionStore.js';
import {enforceAfterPhase, enforceBeforePhase} from './enforcer.js';

export interface TeamRunnerEvent {
  type: 'phase_start' | 'phase_pass' | 'phase_retry' | 'phase_fail' | 'checkpoint';
  phase: TaskPhase;
  agentLabel: string;
  attempt: number;
  message: string;
  output?: string;
}

export interface TeamRunOptions {
  provider: AIProvider;
  cwd: string;
  target: string;
  route: OrchestrationRoute;
  catalog: OrchestrationCatalog;
  pipeline: PreparedPipeline;
  agents: readonly PXHAgent[];
  selectedAgent: PXHAgent;
  attachments?: readonly ImageAttachment[];
  resumeSession?: RuntimeSession;
  onEvent?: (event: TeamRunnerEvent) => void;
  onAgentEvent?: (event: AgentEvent) => void;
}

export interface TeamRunResult {
  content: string;
  session: RuntimeSession;
  phaseOutputs: Readonly<Record<string, string>>;
}

const maximumAttempts = 3;
const handoffCharacterBudget = 16_000;
const phasePromptCharacterBudget = 64_000;

export async function runTeamPipeline(options: TeamRunOptions): Promise<TeamRunResult> {
  const store = new SessionStore(options.cwd);
  const session = options.resumeSession ?? createSession(options);
  session.status = 'running';
  await store.save(session);
  const outputs: Record<string, string> = Object.fromEntries(
    session.steps.flatMap((step) => step.output === undefined ? [] : [[step.phase, step.output]]),
  );

  for (let index = session.currentIndex; index < session.steps.length; index += 1) {
    const step = session.steps[index];
    if (step === undefined || step.status === 'pass') continue;
    session.currentIndex = index;
    const agent = resolvePhaseAgent(step, options.agents, options.selectedAgent);
    let phasePassed = false;
    enforceBeforePhase(session, index, options.cwd);

    for (let attempt = Math.max(1, step.attempts + 1); attempt <= maximumAttempts; attempt += 1) {
      step.status = 'running';
      step.attempts = attempt;
      delete step.error;
      await store.save(session);
      validateRuntimeContract('event', {
        version: contractVersion, type: 'phase_start', phase: step.phase, tier: 'worker',
      } satisfies EventContract);
      options.onEvent?.({
        type: attempt === 1 ? 'phase_start' : 'phase_retry', phase: step.phase,
        agentLabel: agent.label, attempt,
        message: attempt === 1 ? `Bắt đầu ${step.phase}` : `Thử lại ${step.phase} (${attempt}/${maximumAttempts})`,
      });

      try {
        const handoff = buildHandoffContext(session, index);
        const prompt = compactPhasePrompt(buildPhasePrompt(options, agent, step.phase, handoff));
        const response = await options.provider.sendMessage(prompt, {
          cwd: options.cwd,
          ...(options.attachments === undefined || options.attachments.length === 0 ? {} : {attachments: options.attachments}),
          ...(options.onAgentEvent === undefined ? {} : {onEvent: options.onAgentEvent}),
        });
        enforceAfterPhase(session, index, response.content);
        validateRuntimeContract('result', {
          version: contractVersion, status: 'pass', artifacts: [], message: response.content,
        } satisfies ResultContract);
        step.output = response.content;
        outputs[step.phase] = response.content;
        step.status = 'pass';
        phasePassed = true;
        session.currentIndex = index + 1;
        await store.save(session);
        options.onEvent?.({
          type: 'phase_pass', phase: step.phase, agentLabel: agent.label, attempt,
          message: `Hoàn tất ${step.phase}`, output: step.output,
        });
        break;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Phase thất bại.';
        step.error = message;
        step.status = attempt < maximumAttempts && isRetryable(error) ? 'pending' : 'fail';
        await store.save(session);
        if (isCancellation(error)) {
          session.status = 'cancelled';
          await store.save(session);
          throw error;
        }
        if (step.status === 'fail') {
          options.onEvent?.({type: 'phase_fail', phase: step.phase, agentLabel: agent.label, attempt, message});
          session.status = 'fail';
          await store.save(session);
          throw error;
        }
      }
    }

    if (!phasePassed) break;
    options.onEvent?.({
      type: 'checkpoint', phase: step.phase, agentLabel: agent.label, attempt: step.attempts,
      message: `Checkpoint ${index + 1}/${session.steps.length}`,
    });
  }

  if (session.steps.every((step) => step.status === 'pass')) session.status = 'pass';
  await store.save(session);
  const finalContent = [...session.steps].reverse().find((step) => step.output?.trim())?.output ?? 'Pipeline đã hoàn tất.';
  validateRuntimeContract('response', {
    version: contractVersion, status: session.status === 'pass' ? 'ok' : 'error', summary: finalContent,
  } satisfies ResponseContract);
  return {content: finalContent, session, phaseOutputs: outputs};
}

function createSession(options: TeamRunOptions): RuntimeSession {
  const now = new Date().toISOString();
  const steps: RuntimeStepState[] = options.pipeline.tasks.map((task) => {
    const agent = resolveTaskAgent(task.phase, task.agent, options.agents, options.selectedAgent);
    return {phase: task.phase, agentId: agent.id, agentLabel: agent.label, status: 'pending', attempts: 0};
  });
  return {
    version: '1.0', sessionId: options.pipeline.state.sessionId, target: options.target,
    workflowId: options.route.workflow?.id ?? 'company',
    skillIds: options.route.skills.map((skill) => skill.id),
    currentIndex: 0, status: 'running', steps, createdAt: now, updatedAt: now,
  };
}

function resolveTaskAgent(phase: TaskPhase, label: string, agents: readonly PXHAgent[], selected: PXHAgent): PXHAgent {
  return agents.find((agent) => agent.label === label)
    ?? agents.find((agent) => agent.id === agentIdForPhase(phase))
    ?? selected;
}

function resolvePhaseAgent(step: RuntimeStepState, agents: readonly PXHAgent[], selected: PXHAgent): PXHAgent {
  return agents.find((agent) => agent.id === step.agentId) ?? getAgent(step.agentId, agents) ?? selected;
}

function buildPhasePrompt(options: TeamRunOptions, agent: PXHAgent, phase: TaskPhase, handoff: string): string {
  const base = buildAgentPrompt(options.target, agent, options.route, options.catalog);
  return `${base}\n\nCURRENT PHASE: ${phase.toUpperCase()}\nChỉ hoàn thành trách nhiệm của phase này. Dùng tools thật, tạo evidence và trả kết quả ngắn cho specialist tiếp theo.${handoff.length === 0 ? '' : `\n\nHANDOFF CONTEXT:\n${handoff}`}`;
}

function buildHandoffContext(session: RuntimeSession, currentIndex: number): string {
  const values: string[] = [];
  let remaining = handoffCharacterBudget;
  for (let index = currentIndex - 1; index >= 0 && remaining > 0; index -= 1) {
    const step = session.steps[index];
    if (step?.output === undefined) continue;
    const value = `[${step.phase.toUpperCase()} · ${step.agentLabel}]\n${step.output}`;
    const selected = value.length <= remaining ? value : value.slice(value.length - remaining);
    values.unshift(selected);
    remaining -= selected.length;
  }
  return values.join('\n\n');
}

function compactPhasePrompt(prompt: string): string {
  if (prompt.length <= phasePromptCharacterBudget) return prompt;
  const headBudget = 28_000;
  const tailBudget = phasePromptCharacterBudget - headBudget;
  return `${prompt.slice(0, headBudget)}\n\n[CONTEXT AUTO-COMPACTED]\n\n${prompt.slice(prompt.length - tailBudget)}`;
}

function isCancellation(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || /(?:aborted|abort|đã được hủy)/i.test(error.message));
}

function isRetryable(error: unknown): boolean {
  if (isCancellation(error)) return false;
  const message = error instanceof Error ? error.message : '';
  return !/(?:\b429\b|quota|rate[_ -]?limit|does not support image|không hỗ trợ hình ảnh|ENAMETOOLONG|argument list too long|command line.*too long|lặp tool call|vượt quá giới hạn \d+ lượt|không có hoạt động trong \d+ giây)/i.test(message);
}

function validateRuntimeContract(name: 'event' | 'result' | 'response', value: unknown): void {
  const errors = validateContract(name, value);
  if (errors.length > 0) throw new Error(`Contract ${name} không hợp lệ: ${errors.join(' ')}`);
}

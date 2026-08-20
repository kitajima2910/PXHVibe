import type {PXHAgent} from '../agents.js';
import type {OrchestrationRoute} from './types.js';
import {
  contractVersion, validateContract,
  type RequestContract, type StateContract, type TaskContract, type TaskPhase,
} from './contracts.js';

export const runtimeTiers = [
  {id: 'interface', label: 'T1 Interface', responsibility: 'TUI, user input và response.'},
  {id: 'orchestration', label: 'T2 Orchestration', responsibility: 'Classify, route, contracts và pipeline.'},
  {id: 'worker', label: 'T3 Workers', responsibility: 'Agents dùng skills để BUILD.'},
  {id: 'infrastructure', label: 'T4 Infrastructure', responsibility: 'Provider, tools, events và state.'},
] as const;

const workflowPhases: Readonly<Record<string, readonly TaskPhase[]>> = {
  ai: ['analyze', 'architect', 'code', 'test', 'fix', 'review', 'build', 'persist'],
  company: ['analyze', 'architect', 'code', 'test', 'fix', 'review', 'build', 'persist'],
  debug: ['analyze', 'fix', 'test', 'review', 'persist'],
  game: ['analyze', 'architect', 'code', 'test', 'fix', 'review', 'build', 'persist'],
  meeting: ['meeting', 'architect', 'persist'],
  release: ['test', 'fix', 'review', 'build', 'persist'],
  tool: ['analyze', 'architect', 'code', 'test', 'fix', 'review', 'build', 'persist'],
  web: ['analyze', 'architect', 'ui-ux', 'code', 'test', 'fix', 'review', 'build', 'persist'],
};

export type PipelineComplexity = 'simple' | 'standard' | 'full';
export type InteractionMode = 'quick' | 'vibe';

/**
 * Separate conversational/knowledge requests from workspace-changing work.
 * Quick mode is deliberately conservative: an explicit coding action or an
 * imperative action still uses the full vibe pipeline.
 */
export function classifyInteractionMode(target: string): InteractionMode {
  const value = target.toLocaleLowerCase('vi').trim();
  if (value.length === 0) return 'quick';

  const operational = /\b(?:commit|push|publish|deploy|release|rollback|merge|rebase|continue|go on)\b|\b(?:phát hành|đóng gói|tiếp tục|làm tiếp|sửa tiếp|triển khai tiếp)\b/u.test(value);
  const action = /\b(?:fix|build|create|implement|update|upgrade|refactor|review|test|debug|check|run|install|remove|delete|design|edit|patch)\b|(?:sửa|tạo|thêm|xây dựng|triển khai|cập nhật|nâng cấp|kiểm tra|chạy|cài|xóa|đổi|thiết kế|chỉnh|cải thiện)/u.test(value);
  const codingObject = /\b(?:code|file|project|repo|repository|website|web app|app|api|cli|ui|ux|bug|test|readme|package|version|database|component|function|class|git|npm|typescript|javascript|python|react|next\.js)\b|(?:mã nguồn|dự án|tệp|giao diện|chức năng|phiên bản|lỗi)/u.test(value);
  const imperative = /^(?:hãy|vui lòng|giúp tôi|please)\b/u.test(value);

  if (operational || (action && (codingObject || imperative))) return 'vibe';

  const question = /\?\s*$/.test(value)
    || /^(?:ai|gì|ở đâu|khi nào|tại sao|vì sao|thế nào|như thế nào|bao nhiêu|giải thích|cho tôi biết|what|why|how|when|where|who|explain|tell me)\b/u.test(value);
  const social = /^(?:xin chào|chào|hello|hi|hey|cảm ơn|thanks|thank you|bạn là ai)\b/u.test(value);
  if (question || social || !codingObject) return 'quick';
  return 'vibe';
}

/**
 * Ước lượng độ phức tạp của TARGET để quyết định pipeline ngắn hay đầy đủ.
 * Request hỏi/giải thích không cần 8 phase; request build/fix thật mới cần.
 */
export function classifyComplexity(target: string): PipelineComplexity {
  const value = target.toLocaleLowerCase('vi').trim();
  if (value.length === 0) return 'simple';

  const questionLike = /^(?:giải thích|cho tôi biết|kể|nêu|là gì|như thế nào|hãy giải thích|cách dùng|tại sao|tôi muốn hỏi)\b/u.test(value)
    || /\?\s*$/.test(value)
    || value.length < 40 && !/(?:làm|tạo|thêm|xây|sửa|fix|build|viết|implement|code|triển khai)/u.test(value);
  if (questionLike) return 'simple';

  const buildIntent = /(?:làm|tạo|thêm|xây dựng|triển khai|viết|implement|build|create|feature|fix|sửa|debug|test|release|deploy)/u.test(value);
  if (buildIntent && value.length >= 90) return 'full';

  return 'standard';
}

/** Cắt pipeline theo độ phức tạp để giảm số request model. */
export function phasesForComplexity(phases: readonly TaskPhase[], complexity: PipelineComplexity): TaskPhase[] {
  if (complexity === 'full' || phases.length <= 4) return [...phases];
  const reduced: TaskPhase[] = complexity === 'simple'
    ? phases.filter((phase) => phase === 'analyze' || phase === 'persist')
    : phases.filter((phase) => phase === 'analyze' || phase === 'fix' || phase === 'test' || phase === 'persist');
  // Ép thứ tự chuẩn analyze → fix → test → persist thay vì giữ vị trí gốc.
  const ordered = complexity === 'simple'
    ? (['analyze', 'persist'] as TaskPhase[])
    : (['analyze', 'fix', 'test', 'persist'] as TaskPhase[]);
  const result = ordered.filter((phase) => reduced.includes(phase));
  // Chỉ cắt khi giảm được ít nhất 2 phase; giữ nguyên pipeline vốn đã ngắn (debug/release/meeting).
  return result.length <= phases.length - 2 ? result : [...phases];
}

const phaseAgents: Readonly<Record<TaskPhase, string>> = {
  analyze: 'PXH PM (Auto)', meeting: 'PXH PM (Auto)', architect: 'PXH Architect',
  code: 'PXH Expert', fix: 'PXH Bug Hunter', test: 'PXH QA', review: 'PXH Reviewer',
  build: 'PXH DevOps', 'ui-ux': 'PXH UI/UX', persist: 'PXH Historian',
};

const phaseAgentIds: Readonly<Record<TaskPhase, string>> = {
  analyze: 'auto', meeting: 'auto', architect: 'architect', code: 'expert',
  fix: 'fix-bugs', test: 'qa', review: 'review-code', build: 'devops',
  'ui-ux': 'ui-ux', persist: 'save-history',
};

export function agentIdForPhase(phase: TaskPhase): string {
  return phaseAgentIds[phase];
}

export interface PreparedPipeline {
  request: RequestContract;
  tasks: readonly TaskContract[];
  state: StateContract;
}

export function preparePipeline(target: string, route: OrchestrationRoute, agent: PXHAgent): PreparedPipeline {
  const workflow = route.workflow?.id ?? 'company';
  const complexity = classifyComplexity(target);
  const phases = phasesForComplexity(workflowPhases[workflow] ?? workflowPhases.company!, complexity);
  const request: RequestContract = {
    version: contractVersion,
    type: isRequestType(workflow) ? workflow : 'unknown',
    target,
    context: {workflow, skills: route.skills.map((skill) => skill.id)},
  };
  const tasks = phases.map((phase): TaskContract => ({
    version: contractVersion,
    phase,
    target,
    skills: route.skills.map((skill) => skill.id),
    workflow,
    agent: phaseAgents[phase],
  }));
  const state: StateContract = {
    version: contractVersion,
    sessionId: `pxh-${Date.now().toString(36)}`,
    workflow,
    ...(phases[0] === undefined ? {} : {currentPhase: phases[0]}),
    steps: tasks.map((task) => ({phase: task.phase, agent: task.agent, status: 'pending'})),
  };
  assertValid('request', request);
  for (const task of tasks) assertValid('task', task);
  assertValid('state', state);
  return {request, tasks, state};
}

export function formatPipelineForPrompt(pipeline: PreparedPipeline): string {
  return pipeline.tasks.map((task, index) => `${index + 1}. [${task.phase.toUpperCase()}] ${task.agent}`).join('\n');
}

export function validateCapabilityPack(agentCount: number, workflowCount: number, skillCount: number): string[] {
  const errors: string[] = [];
  if (agentCount !== 10) errors.push(`Agent catalog: cần 10, hiện có ${agentCount}.`);
  if (workflowCount !== 8) errors.push(`Workflow catalog: cần 8, hiện có ${workflowCount}.`);
  if (skillCount !== 50) errors.push(`Skill catalog: cần 50, hiện có ${skillCount}.`);
  if (runtimeTiers.length !== 4) errors.push('Runtime phải có 4 tầng.');
  return errors;
}

function assertValid(name: 'request' | 'task' | 'state', value: unknown): void {
  const errors = validateContract(name, value);
  if (errors.length > 0) throw new Error(`Contract ${name} không hợp lệ: ${errors.join(' ')}`);
}

function isRequestType(value: string): value is RequestContract['type'] {
  return ['ai', 'company', 'debug', 'game', 'meeting', 'release', 'tool', 'web'].includes(value);
}

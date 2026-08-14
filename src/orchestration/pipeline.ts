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
  const phases = workflowPhases[workflow] ?? workflowPhases.company!;
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

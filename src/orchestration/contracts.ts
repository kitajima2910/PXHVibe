export const contractVersion = '1.0' as const;

export type RequestType = 'ai' | 'company' | 'debug' | 'game' | 'meeting' | 'release' | 'tool' | 'web' | 'unknown';
export type TaskPhase = 'analyze' | 'meeting' | 'architect' | 'code' | 'fix' | 'test' | 'review' | 'build' | 'ui-ux' | 'persist';
export type TaskStatus = 'pending' | 'running' | 'pass' | 'fail' | 'partial';
export type RuntimeTier = 'interface' | 'orchestration' | 'worker' | 'infrastructure';

export interface RequestContract {
  version: typeof contractVersion;
  type: RequestType;
  target: string;
  context: Record<string, unknown>;
}

export interface TaskContract {
  version: typeof contractVersion;
  phase: TaskPhase;
  target: string;
  skills: string[];
  workflow: string;
  agent: string;
}

export interface ResultContract {
  version: typeof contractVersion;
  status: Exclude<TaskStatus, 'pending' | 'running'>;
  artifacts: Array<{path: string; summary: string}>;
  message?: string;
}

export interface ResponseContract {
  version: typeof contractVersion;
  status: 'ok' | 'error';
  summary: string;
}

export interface EventContract {
  version: typeof contractVersion;
  type: 'phase_start' | 'phase_end' | 'error' | 'decision' | 'checkpoint';
  phase: TaskPhase;
  tier: RuntimeTier;
}

export interface StateContract {
  version: typeof contractVersion;
  sessionId: string;
  workflow: string;
  currentPhase?: TaskPhase;
  steps: Array<{phase: TaskPhase; agent: string; status: TaskStatus}>;
}

export type ContractName = 'request' | 'task' | 'result' | 'response' | 'event' | 'state';

export function validateContract(name: ContractName, value: unknown): string[] {
  if (!isRecord(value)) return [`${name} phải là object.`];
  const errors: string[] = [];
  if (value.version !== contractVersion) errors.push(`${name}.version phải là ${contractVersion}.`);
  if (name === 'request') {
    requiredString(value, 'type', errors); requiredString(value, 'target', errors); requiredRecord(value, 'context', errors);
  } else if (name === 'task') {
    requiredString(value, 'phase', errors); requiredString(value, 'target', errors); requiredArray(value, 'skills', errors);
    requiredString(value, 'workflow', errors); requiredString(value, 'agent', errors);
  } else if (name === 'result') {
    requiredString(value, 'status', errors); requiredArray(value, 'artifacts', errors);
  } else if (name === 'response') {
    requiredString(value, 'status', errors); requiredString(value, 'summary', errors);
  } else if (name === 'event') {
    requiredString(value, 'type', errors); requiredString(value, 'phase', errors); requiredString(value, 'tier', errors);
  } else {
    requiredString(value, 'sessionId', errors); requiredString(value, 'workflow', errors); requiredArray(value, 'steps', errors);
  }
  return errors;
}

function requiredString(value: Record<string, unknown>, key: string, errors: string[]): void {
  if (typeof value[key] !== 'string' || value[key].length === 0) errors.push(`${key} phải là string không rỗng.`);
}
function requiredArray(value: Record<string, unknown>, key: string, errors: string[]): void {
  if (!Array.isArray(value[key])) errors.push(`${key} phải là array.`);
}
function requiredRecord(value: Record<string, unknown>, key: string, errors: string[]): void {
  if (!isRecord(value[key])) errors.push(`${key} phải là object.`);
}
function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

import {mkdir, readFile, rename, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import type {TaskPhase, TaskStatus} from '../orchestration/contracts.js';

export interface RuntimeStepState {
  phase: TaskPhase;
  agentId: string;
  agentLabel: string;
  status: TaskStatus;
  attempts: number;
  output?: string;
  error?: string;
}

export interface RuntimeSession {
  version: '1.0';
  sessionId: string;
  target: string;
  workflowId: string;
  skillIds: string[];
  currentIndex: number;
  status: 'running' | 'pass' | 'fail' | 'cancelled';
  steps: RuntimeStepState[];
  createdAt: string;
  updatedAt: string;
}

export class SessionStore {
  readonly path: string;

  constructor(cwd: string) {
    this.path = join(resolve(cwd), '.pxhvibe', 'runtime-state.json');
  }

  async load(): Promise<RuntimeSession | undefined> {
    try {
      const parsed = JSON.parse(await readFile(this.path, 'utf8')) as RuntimeSession;
      return parsed.version === '1.0' && Array.isArray(parsed.steps) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  async save(session: RuntimeSession): Promise<void> {
    const directory = dirname(this.path);
    await mkdir(directory, {recursive: true});
    const next = {...session, updatedAt: new Date().toISOString()};
    const temporaryPath = `${this.path}.${process.pid}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, this.path);
  }
}

export function summarizeSession(session: RuntimeSession): string {
  const passed = session.steps.filter((step) => step.status === 'pass').length;
  const active = session.steps[session.currentIndex];
  return `${session.workflowId} · ${session.status} · ${passed}/${session.steps.length} phases${active === undefined ? '' : ` · ${active.phase}:${active.agentLabel}`}`;
}

export function makeSessionResumable(session: RuntimeSession): RuntimeSession {
  const steps = session.steps.map((step, index) => {
    if (index < session.currentIndex && step.status === 'pass') return step;
    const {error: _error, ...rest} = step;
    return {...rest, status: 'pending' as const, attempts: 0};
  });
  // Sau resume, thêm bước review cuối để kiểm tra TOÀN BỘ kết quả tích hợp.
  // Các bước trước điểm resume đã 'pass' nhưng chưa được xác minh lại sau thay đổi,
  // nên cần một review tổng thể trước khi kết thúc vibe coding.
  if (steps[steps.length - 1]?.phase !== 'review') {
    steps.push({
      phase: 'review',
      agentId: 'review-code',
      agentLabel: 'PXH Reviewer',
      status: 'pending',
      attempts: 0,
    });
  }
  return {...session, status: 'running', steps};
}

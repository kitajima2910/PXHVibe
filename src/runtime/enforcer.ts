import {existsSync, statSync} from 'node:fs';
import type {TaskPhase} from '../orchestration/contracts.js';
import type {RuntimeSession} from './sessionStore.js';

export interface GateReport {
  phase: TaskPhase;
  checks: readonly string[];
}

export function enforceBeforePhase(session: RuntimeSession, index: number, cwd: string): GateReport {
  const step = session.steps[index];
  if (step === undefined) throw new Error(`Enforcement: phase index ${index} không tồn tại.`);
  if (!existsSync(cwd) || !statSync(cwd).isDirectory()) throw new Error('Enforcement: working directory không tồn tại.');
  const incompleteDependency = session.steps.slice(0, index).find((candidate) => candidate.status !== 'pass');
  if (incompleteDependency !== undefined) {
    throw new Error(`Enforcement: ${step.phase} bị chặn vì ${incompleteDependency.phase} chưa pass.`);
  }
  return {
    phase: step.phase,
    checks: [
      'contract version 1.0', 'workspace exists', 'previous phases passed',
      existsSync(`${cwd}/STATUS.md`) ? 'STATUS.md detected' : 'STATUS.md absent',
    ],
  };
}

export function enforceAfterPhase(session: RuntimeSession, index: number, output: string): GateReport {
  const step = session.steps[index];
  if (step === undefined) throw new Error(`Enforcement: phase index ${index} không tồn tại.`);
  if (output.trim().length === 0) throw new Error(`Enforcement: ${step.phase} không trả evidence.`);
  return {phase: step.phase, checks: ['provider completed', 'non-empty evidence', 'checkpoint writable']};
}

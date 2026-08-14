import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {agents, getAgent} from '../agents.js';
import {emptyCatalog} from '../orchestration/builtins.js';
import {preparePipeline} from '../orchestration/pipeline.js';
import {routeOrchestration} from '../orchestration/router.js';
import type {AIProvider} from '../providers/AIProvider.js';
import type {ProviderRequestOptions, ProviderResponse} from '../types/provider.js';
import {SessionStore} from '../runtime/sessionStore.js';
import {runTeamPipeline, type TeamRunnerEvent} from '../runtime/teamRunner.js';
import {enforceAfterPhase, enforceBeforePhase} from '../runtime/enforcer.js';

class SequenceProvider implements AIProvider {
  readonly name = 'Sequence';
  prompts: string[] = [];
  calls = 0;
  cancelled = false;
  constructor(private failures = 0) {}
  async sendMessage(prompt: string, _options: ProviderRequestOptions): Promise<ProviderResponse> {
    this.calls += 1;
    this.prompts.push(prompt);
    if (this.calls <= this.failures) throw new Error('temporary network failure');
    const phase = /CURRENT PHASE: ([A-Z-]+)/.exec(prompt)?.[1] ?? 'UNKNOWN';
    return {content: `${phase} output ${this.calls}`};
  }
  cancel(): void { this.cancelled = true; }
}

class TooLongProvider implements AIProvider {
  readonly name = 'TooLong';
  calls = 0;
  async sendMessage(): Promise<ProviderResponse> {
    this.calls += 1;
    throw Object.assign(new Error('spawn ENAMETOOLONG'), {code: 'ENAMETOOLONG'});
  }
  cancel(): void {}
}

const root = await mkdtemp(join(tmpdir(), 'pxhvibe-team-'));
try {
  const target = 'sửa lỗi đăng nhập bị crash';
  const route = routeOrchestration(target, emptyCatalog);
  const selectedAgent = getAgent('fix-bugs');
  const pipeline = preparePipeline(target, route, selectedAgent);
  const provider = new SequenceProvider();
  const events: TeamRunnerEvent[] = [];
  const result = await runTeamPipeline({
    provider, cwd: root, target, route, catalog: emptyCatalog, pipeline,
    agents, selectedAgent, onEvent: (event) => events.push(event),
  });

  assert.equal(provider.calls, 5);
  assert.deepEqual(provider.prompts.map((prompt) => /CURRENT PHASE: ([A-Z-]+)/.exec(prompt)?.[1]),
    ['ANALYZE', 'FIX', 'TEST', 'REVIEW', 'PERSIST']);
  assert.match(provider.prompts[1] ?? '', /AGENT ROLE: PXH Bug Hunter/);
  assert.match(provider.prompts[2] ?? '', /HANDOFF CONTEXT:[\s\S]+ANALYZE output 1/);
  assert.equal(result.session.status, 'pass');
  assert.equal(result.session.steps.every((step) => step.status === 'pass'), true);
  assert.equal(result.content, 'PERSIST output 5');
  assert.equal(events.filter((event) => event.type === 'phase_pass').length, 5);
  const persisted = await new SessionStore(root).load();
  assert.equal(persisted?.status, 'pass');
  assert.equal(persisted?.steps.length, 5);
  assert.ok(enforceBeforePhase(result.session, 4, root).checks.includes('previous phases passed'));
  assert.throws(() => enforceAfterPhase(result.session, 4, ''), /không trả evidence/);

  const retryRoot = await mkdtemp(join(tmpdir(), 'pxhvibe-team-retry-'));
  try {
    const retryProvider = new SequenceProvider(1);
    const retryResult = await runTeamPipeline({
      provider: retryProvider, cwd: retryRoot, target, route, catalog: emptyCatalog,
      pipeline: preparePipeline(target, route, selectedAgent), agents, selectedAgent,
    });
    assert.equal(retryProvider.calls, 6);
    assert.equal(retryResult.session.steps[0]?.attempts, 2);
    assert.equal(retryResult.session.status, 'pass');
  } finally {
    await rm(retryRoot, {recursive: true, force: true});
  }

  const continuationRoot = await mkdtemp(join(tmpdir(), 'pxhvibe-team-continuation-'));
  try {
    const continuationProvider = new SequenceProvider(2);
    const continuationResult = await runTeamPipeline({
      provider: continuationProvider, cwd: continuationRoot, target, route, catalog: emptyCatalog,
      pipeline: preparePipeline(target, route, selectedAgent), agents, selectedAgent,
    });
    assert.equal(continuationProvider.calls, 7);
    assert.equal(continuationResult.session.steps[0]?.attempts, 3);
    assert.equal(continuationResult.session.status, 'pass');
  } finally {
    await rm(continuationRoot, {recursive: true, force: true});
  }

  const resumeRoot = await mkdtemp(join(tmpdir(), 'pxhvibe-team-resume-'));
  try {
    const failingProvider = new SequenceProvider(3);
    await assert.rejects(runTeamPipeline({
      provider: failingProvider, cwd: resumeRoot, target, route, catalog: emptyCatalog,
      pipeline: preparePipeline(target, route, selectedAgent), agents, selectedAgent,
    }), /temporary network failure/);
    const failed = await new SessionStore(resumeRoot).load();
    assert.equal(failed?.status, 'fail');
    assert.equal(failed?.currentIndex, 0);
    assert.equal(failed?.steps[0]?.attempts, 3);
    assert.ok(failed !== undefined);
    const resumable: typeof failed = {
      ...failed,
      status: 'running',
      steps: failed.steps.map((step, index) => index < failed.currentIndex && step.status === 'pass'
        ? step
        : resetStep(step)),
    };
    const resumedProvider = new SequenceProvider();
    const resumed = await runTeamPipeline({
      provider: resumedProvider, cwd: resumeRoot, target, route, catalog: emptyCatalog,
      pipeline: preparePipeline(target, route, selectedAgent), agents, selectedAgent,
      resumeSession: resumable,
    });
    assert.equal(resumedProvider.calls, 5);
    assert.equal(resumed.session.status, 'pass');
  } finally {
    await rm(resumeRoot, {recursive: true, force: true});
  }

  const tooLongRoot = await mkdtemp(join(tmpdir(), 'pxhvibe-team-too-long-'));
  try {
    const tooLongProvider = new TooLongProvider();
    await assert.rejects(runTeamPipeline({
      provider: tooLongProvider, cwd: tooLongRoot, target, route, catalog: emptyCatalog,
      pipeline: preparePipeline(target, route, selectedAgent), agents, selectedAgent,
    }), /ENAMETOOLONG/);
    assert.equal(tooLongProvider.calls, 1);
  } finally {
    await rm(tooLongRoot, {recursive: true, force: true});
  }
} finally {
  await rm(root, {recursive: true, force: true});
}

console.log('Team runner tests: passed');

function resetStep<T extends {error?: string; status: string; attempts: number}>(step: T): T {
  const {error: _error, ...rest} = step;
  return {...rest, status: 'pending', attempts: 0} as T;
}

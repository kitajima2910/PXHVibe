import assert from 'node:assert/strict';
import {agents, getAgent} from '../agents.js';
import type {OrchestrationCatalog} from '../orchestration/types.js';
const emptyCatalog: OrchestrationCatalog = {projectInstructions: [], agents: [], skills: [], workflows: []};
import {contractVersion, validateContract} from '../orchestration/contracts.js';
import {classifyComplexity, classifyInteractionMode, phasesForComplexity, preparePipeline, runtimeTiers, validateCapabilityPack} from '../orchestration/pipeline.js';
import {classifyWorkflowIntent, routeOrchestration} from '../orchestration/router.js';
import {buildAgentPrompt, buildQuickAnswerPrompt} from '../utils/agentPrompt.js';

assert.equal(agents.length, 10);
assert.equal(runtimeTiers.length, 4);
assert.ok(validateCapabilityPack(agents.length, 0, 0).length > 0); // No bundled skills/workflows anymore

const html5GameTarget = `Build a polished single-player browser game as an HTML5 web app.
Use a responsive frontend UI and canvas rendering. The player fights enemies and a mini-boss.
Include gameplay movement, shooting, three levels, score, lives and game-over.`;
const gameIntent = classifyWorkflowIntent(html5GameTarget);
assert.equal(gameIntent?.workflowId, 'game');
const gameRoute = routeOrchestration(html5GameTarget, emptyCatalog);
assert.equal(gameRoute.workflow?.id, 'game');
assert.equal(gameRoute.workflow?.preferredAgentId, 'expert');
assert.deepEqual(gameRoute.skills.slice(0, 2).map((skill) => skill.id), ['game-development', 'games-testing']);
assert.ok((gameRoute.confidence ?? 0) >= 0.8);

const gameBugRoute = routeOrchestration('Fix crash khi player chạm boss trong game', emptyCatalog);
assert.equal(gameBugRoute.workflow?.id, 'debug');
assert.ok(gameBugRoute.skills.some((skill) => skill.id === 'game-development'));

const route = routeOrchestration('sửa lỗi đăng nhập bị crash', emptyCatalog);
assert.equal(route.workflow?.id, 'debug');
const worker = getAgent('fix-bugs');
const pipeline = preparePipeline('sửa lỗi đăng nhập bị crash', route, worker);
assert.equal(pipeline.request.version, contractVersion);
assert.equal(pipeline.request.type, 'debug');
assert.deepEqual(pipeline.tasks.map((task) => task.phase), ['analyze', 'fix', 'test', 'review', 'persist']);
assert.equal(pipeline.tasks[1]?.agent, 'PXH Bug Hunter');
assert.equal(validateContract('request', pipeline.request).length, 0);
assert.equal(validateContract('task', pipeline.tasks[0]).length, 0);
assert.equal(validateContract('state', pipeline.state).length, 0);
assert.equal(validateContract('event', {version: contractVersion, type: 'phase_start', phase: 'fix', tier: 'worker'}).length, 0);
assert.equal(validateContract('result', {version: contractVersion, status: 'pass', artifacts: []}).length, 0);
assert.equal(validateContract('response', {version: contractVersion, status: 'ok', summary: 'done'}).length, 0);
assert.ok(validateContract('request', {version: '0', target: ''}).length >= 2);

const prompt = buildAgentPrompt('sửa lỗi đăng nhập bị crash');
assert.match(prompt, /RULE:/);
assert.match(prompt, /TARGET:/);

// Smart pipeline gating: request ngắn/hỏi không cần chạy full 8 phase.
assert.equal(classifyComplexity('giải thích file này là gì'), 'simple');
assert.equal(classifyComplexity('hàm này hoạt động như thế nào?'), 'simple');
assert.equal(classifyComplexity('sửa lỗi đăng nhập'), 'standard');
assert.equal(classifyComplexity('tạo website bán hàng với React, Next.js, database, auth, payment, deploy, CI/CD, monitoring và scaling cho production'), 'full');
assert.equal(classifyInteractionMode('React là gì?'), 'quick');
assert.equal(classifyInteractionMode('xin chào, bạn là ai?'), 'quick');
assert.equal(classifyInteractionMode('thời tiết hôm nay thế nào?'), 'quick');
assert.equal(classifyInteractionMode('giải thích hàm này hoạt động ra sao'), 'quick');
assert.equal(classifyInteractionMode('hãy sửa lỗi đăng nhập'), 'vibe');
assert.equal(classifyInteractionMode('update version của PXHVibe'), 'vibe');
assert.equal(classifyInteractionMode('hãy check và cải thiện nó'), 'vibe');
assert.equal(classifyInteractionMode('tiếp tục task'), 'vibe');
const quickPrompt = buildQuickAnswerPrompt('React là gì?', ['[USER]\nXin chào']);
assert.match(quickPrompt, /QUICK ANSWER MODE/);
assert.match(quickPrompt, /Không chạy tool/);
assert.doesNotMatch(quickPrompt, /Cập nhật STATUS\.md: đã thay đổi gì/);
assert.deepEqual(phasesForComplexity(['analyze', 'architect', 'code', 'test', 'fix', 'review', 'build', 'persist'], 'simple'),
  ['analyze', 'persist']);
assert.deepEqual(phasesForComplexity(['analyze', 'architect', 'code', 'test', 'fix', 'review', 'build', 'persist'], 'standard'),
  ['analyze', 'fix', 'test', 'persist']);
assert.deepEqual(phasesForComplexity(['analyze', 'architect', 'code', 'test', 'fix', 'review', 'build', 'persist'], 'full'),
  ['analyze', 'architect', 'code', 'test', 'fix', 'review', 'build', 'persist']);
// Pipeline ngắn (debug/release) không bị cắt thêm.
assert.deepEqual(phasesForComplexity(['analyze', 'fix', 'test', 'review', 'persist'], 'standard'),
  ['analyze', 'fix', 'test', 'review', 'persist']);

const simpleRoute = routeOrchestration('giải thích pipeline hoạt động ra sao', emptyCatalog);
const simplePipeline = preparePipeline('giải thích pipeline hoạt động ra sao', simpleRoute, getAgent('help'));
assert.deepEqual(simplePipeline.tasks.map((task) => task.phase), ['analyze', 'persist']);

console.log('Pipeline and contract tests: passed');

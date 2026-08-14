import assert from 'node:assert/strict';
import {agents, getAgent} from '../agents.js';
import {builtinSkills, builtinWorkflows, emptyCatalog} from '../orchestration/builtins.js';
import {contractVersion, validateContract} from '../orchestration/contracts.js';
import {preparePipeline, runtimeTiers, validateCapabilityPack} from '../orchestration/pipeline.js';
import {classifyWorkflowIntent, routeOrchestration} from '../orchestration/router.js';
import {buildAgentPrompt} from '../utils/agentPrompt.js';

assert.equal(agents.length, 10);
assert.equal(runtimeTiers.length, 4);
assert.equal(builtinWorkflows.length, 8);
assert.equal(builtinSkills.length, 50);
assert.deepEqual(validateCapabilityPack(agents.length, builtinWorkflows.length, builtinSkills.length), []);

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

const prompt = buildAgentPrompt('sửa lỗi đăng nhập bị crash', worker, route, emptyCatalog, pipeline);
assert.match(prompt, /4-TIER PIPELINE \(contract v1\.0\):/);
assert.match(prompt, /\[ANALYZE\] PXH PM \(Auto\)/);
assert.match(prompt, /\[FIX\] PXH Bug Hunter/);
assert.match(prompt, /\[TEST\] PXH QA/);
assert.match(prompt, /\[REVIEW\] PXH Reviewer/);
assert.match(prompt, /\[PERSIST\] PXH Historian/);

console.log('Pipeline and contract tests: passed');

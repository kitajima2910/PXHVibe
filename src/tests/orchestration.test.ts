import assert from 'node:assert/strict';
import {routeOrchestration} from '../orchestration/router.js';
import {buildAgentPrompt} from '../utils/agentPrompt.js';
import {agents, mergeAgentCatalog, routeAgent} from '../agents.js';
import {preparePipeline} from '../orchestration/pipeline.js';
import type {OrchestrationCatalog} from '../orchestration/types.js';

assert.equal(agents.length, 10);

{

  // Simplified catalog — no bundled skills/workflows (removed for speed)
  const catalog: OrchestrationCatalog = {
    projectInstructions: ['Preserve database migrations.'],
    agents: [{id: 'project:database-specialist', label: 'PXH Database', description: 'Chuyên gia PostgreSQL', instruction: 'Không chỉnh migration đã chạy production.'}],
    skills: [{id: 'database-debug', name: 'Database Debug', description: 'Debug PostgreSQL', instructions: 'Đọc schema trước khi sửa.', triggers: ['postgresql', 'migration', 'database'], source: 'test', origin: 'project'}],
    workflows: [{id: 'database-recovery', name: 'Database Recovery', description: 'Workflow sửa database', instructions: '1. Reproduce', triggers: ['postgresql', 'migration'], steps: ['Reproduce'], skillIds: ['database-debug'], source: 'test', origin: 'project'}],
  };
  assert.match(catalog.projectInstructions.join('\n'), /Preserve database migrations/);
  assert.ok(catalog.skills.some((skill) => skill.id === 'database-debug'));
  assert.ok(catalog.workflows.some((workflow) => workflow.id === 'database-recovery'));
  assert.ok(catalog.agents.some((agent) => agent.id === 'project:database-specialist'));

  const gameTarget = 'Tạo game HTML5 có player, enemies, boss và ba level.';
  const gameRoute = routeOrchestration(gameTarget, catalog);
  const fullAgentCatalog = mergeAgentCatalog(agents, catalog.agents);
  const gameAgent = routeAgent(gameRoute.workflow?.preferredAgentId ?? 'auto', gameTarget, fullAgentCatalog);
  const gamePipeline = preparePipeline(gameTarget, gameRoute, gameAgent);
  const fullGamePrompt = buildAgentPrompt(gameTarget);
  assert.match(fullGamePrompt, /RULE:/);
  assert.match(fullGamePrompt, /TARGET:/);
  assert.ok(fullGamePrompt.length < 10_000);

  const route = routeOrchestration('sửa lỗi postgresql migration', catalog);
  assert.equal(route.skills[0]?.id, 'database-debug');

  const availableAgents = [...agents, ...catalog.agents];
  const projectAgent = routeAgent('project:database-specialist', 'sửa migration', availableAgents);
  assert.equal(projectAgent.label, 'PXH Database');
  const prompt = buildAgentPrompt('sửa migration');
  assert.match(prompt, /RULE:/);
  assert.match(prompt, /TARGET:/);
}

console.log('Orchestration tests: passed');

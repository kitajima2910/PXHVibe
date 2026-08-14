import assert from 'node:assert/strict';
import {mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {discoverOrchestration} from '../orchestration/discovery.js';
import {routeOrchestration} from '../orchestration/router.js';
import {buildAgentPrompt} from '../utils/agentPrompt.js';
import {agents, routeAgent} from '../agents.js';
import {builtinSkills, builtinWorkflows} from '../orchestration/builtins.js';

assert.equal(agents.length, 10);
assert.equal(builtinSkills.length, 50);
assert.equal(builtinWorkflows.length, 8);

const root = await mkdtemp(join(tmpdir(), 'pxhvibe-orchestration-'));
try {
  await mkdir(join(root, '.pxhvibe', 'skills', 'database-debug'), {recursive: true});
  await mkdir(join(root, '.pxhvibe', 'workflows'), {recursive: true});
  await mkdir(join(root, '.pxhvibe', 'agents'), {recursive: true});
  await writeFile(join(root, 'AGENTS.md'), '# Project rules\n- Preserve database migrations.\n', 'utf8');
  await writeFile(join(root, '.pxhvibe', 'skills', 'database-debug', 'SKILL.md'), `---
name: database-debug
description: Điều tra lỗi PostgreSQL và migration
triggers: [postgresql, migration, database]
---
# Database Debug
Đọc schema và migration trước khi sửa.
`, 'utf8');
  await writeFile(join(root, '.pxhvibe', 'workflows', 'database.workflow.md'), `---
name: Database Recovery
description: Workflow sửa database
triggers: [postgresql, migration]
agent: database-specialist
skills: [database-debug, process-verification]
---
# Database Recovery
1. Reproduce the migration failure.
2. Inspect schema history.
3. Patch and verify.
`, 'utf8');
  await writeFile(join(root, '.pxhvibe', 'agents', 'database-specialist.md'), `---
description: Chuyên gia PostgreSQL và migration
---
# PXH Database
Không chỉnh migration đã chạy production.
`, 'utf8');

  const catalog = discoverOrchestration(root);
  assert.match(catalog.projectInstructions.join('\n'), /Preserve database migrations/);
  assert.ok(catalog.skills.some((skill) => skill.id === 'database-debug'));
  assert.ok(catalog.workflows.some((workflow) => workflow.id === 'database-recovery'));
  assert.ok(catalog.agents.some((agent) => agent.id === 'project:database-specialist'));
  assert.equal(catalog.skills.length, 51);
  assert.equal(catalog.workflows.length, 9);
  assert.ok(catalog.skills.some((skill) => skill.id === 'process-systematic-debugging'));

  const route = routeOrchestration('sửa lỗi postgresql migration', catalog);
  assert.equal(route.workflow?.name, 'Database Recovery');
  assert.equal(route.skills[0]?.id, 'database-debug');
  assert.ok(route.skills.some((skill) => skill.id === 'process-verification'));

  const availableAgents = [...agents, ...catalog.agents];
  const projectAgent = routeAgent('project:database-specialist', 'sửa migration', availableAgents);
  assert.equal(projectAgent.label, 'PXH Database');
  const prompt = buildAgentPrompt('sửa migration', projectAgent, route, catalog);
  assert.match(prompt, /PROJECT INSTRUCTIONS \(AGENTS\.md\):/);
  assert.match(prompt, /Preserve database migrations/);
  assert.match(prompt, /WORKFLOW: Database Recovery/);
  assert.match(prompt, /ACTIVE SKILLS:/);
  assert.match(prompt, /Đọc schema và migration trước khi sửa/);
  assert.match(prompt, /AGENT ROLE: PXH Database/);
} finally {
  await rm(root, {recursive: true, force: true});
}

console.log('Orchestration tests: passed');

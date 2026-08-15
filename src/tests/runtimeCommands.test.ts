import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {
  commandDefinitions, detectProject, formatCommandList, formatDiffStat, formatHistoryDetails,
  formatPipelineDetails, getGitDiffSummary,
} from '../runtime/commands.js';

assert.equal(commandDefinitions.length, 24);
assert.equal(new Set(commandDefinitions.map(([command]) => command)).size, 24);
for (const command of ['/paste', '/cancel', '/retry', '/new', '/resume', '/session', '/context', '/detect', '/doctor', '/diff', '/history', '/version', '/about', '/clear']) {
  assert.ok(formatCommandList().includes(command));
}
assert.match(formatCommandList(), /^AI\s+\/models/m);
assert.match(formatCommandList(), /^Phiên\s+\/new/m);
assert.match(formatCommandList(), /^Project\s+\/status/m);
assert.match(formatCommandList(), /^Tiện ích\s+\/paste/m);
assert.equal(formatPipelineDetails('debug', [
  {phase: 'analyze', agent: 'PXH PM', status: 'pass'},
  {phase: 'fix', agent: 'PXH Bug Hunter', status: 'running'},
]), 'PIPELINE · DEBUG · 1/2\n✓ ANALYZE · PXH PM · pass\n● FIX · PXH Bug Hunter · running');
assert.equal(formatHistoryDetails([
  {phase: 'analyze', agent: 'PXH PM', status: 'pass', attempts: 1},
]), 'HISTORY · 1 PHASES\n✓ ANALYZE · pass · 1 lần');
assert.equal(formatDiffStat('a\nb\nc', 2), 'GIT DIFF\na\nb\n… còn 1 dòng');

const root = await mkdtemp(join(tmpdir(), 'pxhvibe-detect-'));
try {
  await writeFile(join(root, 'package.json'), JSON.stringify({
    dependencies: {react: '^19.0.0', phaser: '^3.0.0'},
    devDependencies: {typescript: '^5.0.0'},
  }), 'utf8');
  assert.equal(detectProject(root), 'Project: Node.js · React · Phaser · TypeScript');
  assert.match(getGitDiffSummary(root), /không phải Git repository|git diff thất bại/);
} finally {
  await rm(root, {recursive: true, force: true});
}

console.log('Runtime command tests: passed');

import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {commandDefinitions, detectProject, formatCommandList, getGitDiffSummary} from '../runtime/commands.js';

assert.equal(commandDefinitions.length, 23);
assert.equal(new Set(commandDefinitions.map(([command]) => command)).size, 23);
for (const command of ['/paste', '/cancel', '/retry', '/new', '/resume', '/session', '/context', '/detect', '/doctor', '/diff', '/history', '/version', '/about', '/clear']) {
  assert.ok(formatCommandList().includes(command));
}
assert.match(formatCommandList(), /^AI\s+\/models/m);
assert.match(formatCommandList(), /^Phiên\s+\/new/m);
assert.match(formatCommandList(), /^Project\s+\/status/m);
assert.match(formatCommandList(), /^Tiện ích\s+\/paste/m);

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

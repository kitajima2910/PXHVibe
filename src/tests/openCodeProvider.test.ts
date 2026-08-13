import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {parseModelName, parseProviderName} from '../providers/createProvider.js';
import {
  defaultOpenCodeModel,
  OpenCodeProvider,
  resolveOpenCodeExecutable,
} from '../providers/OpenCodeProvider.js';

assert.equal(parseProviderName([]), 'opencode');
assert.equal(parseModelName([]), defaultOpenCodeModel);
assert.equal(
  parseModelName(['--model=opencode/deepseek-v4-flash-free']),
  'opencode/deepseek-v4-flash-free',
);
assert.match(new OpenCodeProvider().name, /mimo-v2\.5-free/);

const executable = resolveOpenCodeExecutable();
if (process.platform === 'win32') {
  assert.ok(executable === 'opencode' || existsSync(executable));
}

console.log(`OpenCode wrapper tests: passed (${executable})`);

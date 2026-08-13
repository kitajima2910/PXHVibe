import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {parseModelName, parseProviderName} from '../providers/createProvider.js';
import {
  defaultOpenCodeModel,
  OpenCodeProvider,
  getRequestTimeoutMs,
  resolveOpenCodeExecutable,
} from '../providers/OpenCodeProvider.js';

assert.equal(parseProviderName([]), 'free');
assert.equal(parseModelName([]), defaultOpenCodeModel);
assert.equal(
  parseModelName(['--model=opencode/deepseek-v4-flash-free']),
  'opencode/deepseek-v4-flash-free',
);
assert.equal(defaultOpenCodeModel, 'opencode/big-pickle');
assert.equal(new OpenCodeProvider().name, 'Free · Big Pickle');
delete process.env.PXH_REQUEST_TIMEOUT_MS;
assert.equal(getRequestTimeoutMs(), 120_000);

const executable = resolveOpenCodeExecutable();
if (process.platform === 'win32') {
  assert.ok(executable === 'opencode' || existsSync(executable));
}

console.log(`Free runtime tests: passed (${executable})`);

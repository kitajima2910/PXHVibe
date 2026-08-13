import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {parseModelName, parseProviderName} from '../providers/createProvider.js';
import {
  defaultOpenCodeModel,
  buildOpenCodeArguments,
  OpenCodeProvider,
  getRequestTimeoutMs,
  parseOpenCodeEvent,
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
const buildArguments = buildOpenCodeArguments('target', defaultOpenCodeModel);
assert.ok(buildArguments.includes('--auto'));
assert.deepEqual(buildArguments.slice(-4), ['--agent', 'build', '--auto', 'target']);

const step = parseOpenCodeEvent(JSON.stringify({type: 'step_start', part: {type: 'step-start'}}));
assert.deepEqual(step.events, [{type: 'activity', content: 'Đang phân tích yêu cầu...'}]);

const tool = parseOpenCodeEvent(JSON.stringify({
  type: 'tool_use',
  part: {
    tool: 'write',
    state: {status: 'completed', title: 'demo.txt', output: 'Wrote file successfully.'},
  },
}), step.stepCount);
assert.deepEqual(tool.events, [
  {type: 'tool_start', toolName: 'tạo file'},
  {type: 'tool_complete', toolName: 'tạo file', summary: 'demo.txt'},
]);

const textEvent = parseOpenCodeEvent(JSON.stringify({
  type: 'text',
  part: {text: 'Đã hoàn tất.'},
}), tool.stepCount);
assert.equal(textEvent.text, 'Đã hoàn tất.');
assert.deepEqual(textEvent.events, [{type: 'text_delta', content: 'Đã hoàn tất.'}]);

const executable = resolveOpenCodeExecutable();
if (process.platform === 'win32') {
  assert.ok(executable === 'opencode' || existsSync(executable));
}

console.log(`Free runtime tests: passed (${executable})`);

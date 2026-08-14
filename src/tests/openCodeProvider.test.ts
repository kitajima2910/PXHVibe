import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {parseModelName, parseProviderName} from '../providers/createProvider.js';
import {
  defaultOpenCodeModel,
  buildOpenCodeArguments,
  createInactivityTimer,
  OpenCodeProvider,
  getRequestTimeoutMs,
  parseOpenCodeEvent,
  resolveOpenCodeExecutable,
  writePromptToStdin,
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
assert.equal(getRequestTimeoutMs(), 300_000);
let inactivityExpired = 0;
let cancelledTimers = 0;
const scheduledCallbacks: Array<() => void> = [];
const inactivityTimer = createInactivityTimer(
  300_000,
  () => { inactivityExpired += 1; },
  (callback, delay) => {
    assert.equal(delay, 300_000);
    scheduledCallbacks.push(callback);
    return scheduledCallbacks.length as unknown as ReturnType<typeof setTimeout>;
  },
  () => { cancelledTimers += 1; },
);
inactivityTimer.touch();
inactivityTimer.touch();
assert.equal(scheduledCallbacks.length, 2);
assert.equal(cancelledTimers, 1);
scheduledCallbacks[1]?.();
assert.equal(inactivityExpired, 1);
inactivityTimer.clear();
assert.equal(cancelledTimers, 1);
const buildArguments = buildOpenCodeArguments(defaultOpenCodeModel);
assert.ok(buildArguments.includes('--auto'));
assert.deepEqual(buildArguments.slice(-3), ['--agent', 'build', '--auto']);
const imageArguments = buildOpenCodeArguments(defaultOpenCodeModel, ['C:\\Temp\\shot.png']);
assert.deepEqual(imageArguments.slice(-2), ['--file', 'C:\\Temp\\shot.png']);
const longPrompt = 'Tạo game Bắn Ruồi Đại Chiến.\n'.repeat(10_000);
const longPromptArguments = buildOpenCodeArguments(defaultOpenCodeModel);
assert.equal(longPromptArguments.includes(longPrompt), false);
assert.ok(longPromptArguments.every((argument) => argument.length < 1_000));
let pipedPrompt = '';
writePromptToStdin({
  end(chunk, encoding) {
    assert.equal(encoding, 'utf8');
    pipedPrompt = chunk;
  },
}, longPrompt);
assert.equal(pipedPrompt, longPrompt);

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

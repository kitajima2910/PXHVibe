import assert from 'node:assert/strict';
import React from 'react';
import {render} from 'ink';
import {PassThrough} from 'node:stream';
import {App, buildContextualTarget, buildRoutingTarget, getErrorMessage, isCancellationError, isImageUnsupportedError, isModelLimitError} from '../app.js';
import {getSystemMessageColor} from '../components/MessageList.js';
import type {AIProvider} from '../providers/AIProvider.js';
import type {ProviderRequestOptions, ProviderResponse} from '../types/provider.js';
import {stripAnsi} from '../utils/stripAnsi.js';
import {appVersion} from '../version.js';
import {getContextUsage} from '../runtime/contextManager.js';
import {mkdtemp, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

class CountingProvider implements AIProvider {
  readonly name = 'Test';
  calls = 0;
  lastPrompt = '';
  prompts: string[] = [];
  lastOptions: ProviderRequestOptions | undefined;
  async sendMessage(prompt: string, options: ProviderRequestOptions): Promise<ProviderResponse> {
    this.calls += 1;
    this.lastPrompt = prompt;
    this.prompts.push(prompt);
    this.lastOptions = options;
    return {content: 'unexpected'};
  }
  cancel(): void {}
}

const provider = new CountingProvider();
const appRoot = await mkdtemp(join(tmpdir(), 'pxhvibe-app-'));
assert.equal(isModelLimitError('HTTP 429 rate_limit_exceeded'), true);
assert.equal(isModelLimitError('Quota exceeded for this model'), true);
assert.equal(isModelLimitError('Network unavailable'), false);
assert.equal(isCancellationError(Object.assign(new Error('cancelled'), {name: 'AbortError'})), true);
assert.equal(isCancellationError(new Error('Network unavailable')), false);
assert.equal(isImageUnsupportedError('This model does not support image input'), true);
assert.equal(isImageUnsupportedError('Vision is not enabled for this model'), true);
assert.equal(isImageUnsupportedError('Unsupported content type', true), true);
assert.equal(isImageUnsupportedError('Unsupported content type', false), false);
assert.equal(
  getErrorMessage(new Error('This model does not support image input'), true),
  'MODEL KHÔNG HỖ TRỢ HÌNH ẢNH · Hãy bỏ ảnh hoặc chọn model vision khác bằng /models.',
);
assert.equal(
  getErrorMessage(new Error('HTTP 429: too many requests')),
  'MODEL ĐÃ HẾT GIỚI HẠN · Hãy chờ quota được làm mới hoặc chọn model khác bằng /models.',
);
assert.equal(getSystemMessageColor({
  id: 'limit', role: 'system', tone: 'error', content: 'limit', createdAt: new Date(),
}), 'red');
const bridgedTarget = buildContextualTarget([{
  id: 'raw-paste',
  role: 'user',
  content: '~2 dòng',
  contextContent: '[PASTED BLOCK 1]\ndòng một\ndòng hai',
  createdAt: new Date(),
}], 'tiếp tục task');
assert.match(bridgedTarget, /dòng một\ndòng hai/);
assert.doesNotMatch(bridgedTarget, /~2 dòng/);
assert.match(bridgedTarget, /TARGET HIỆN TẠI:\ntiếp tục task$/);
const oversizedMessages = [
  {id: 'anchor', role: 'user' as const, content: `TARGET-GỐC ${'a'.repeat(5_000)}`},
  {id: 'middle', role: 'assistant' as const, content: 'b'.repeat(20_000)},
  {id: 'latest', role: 'user' as const, content: `LƯỢT-MỚI ${'c'.repeat(10_000)}`},
];
const compactedTarget = buildContextualTarget(oversizedMessages.map((message) => ({...message, createdAt: new Date()})), 'tiếp tục');
assert.match(compactedTarget, /TARGET-GỐC/);
assert.match(compactedTarget, /LƯỢT-MỚI/);
assert.match(compactedTarget, /CONTEXT AUTO-COMPACTED/);
const contextUsage = getContextUsage(oversizedMessages);
assert.equal(contextUsage.percent, 100);
assert.equal(contextUsage.compacted, true);
assert.equal(contextUsage.estimatedTokens, 6_000);
assert.equal(buildRoutingTarget([{
  id: 'old', role: 'user', content: 'tạo website', createdAt: new Date(),
}], 'làm game HTML5 có player và enemies'), 'làm game HTML5 có player và enemies');
assert.equal(buildRoutingTarget([{
  id: 'old', role: 'user', content: 'làm game HTML5', createdAt: new Date(),
}], 'tiếp tục task'), 'làm game HTML5\ntiếp tục task');
const input = new PassThrough();
Object.assign(input, {isTTY: true, setRawMode: () => input, ref: () => input, unref: () => input});
const output = new PassThrough();
Object.assign(output, {columns: 140, rows: 60, isTTY: true});
let rendered = '';
output.on('data', (chunk) => { rendered += chunk.toString('utf8'); });
const instance = render(React.createElement(App, {
  provider,
  workingDirectory: appRoot,
  checkModels: async () => ({
    checkedAt: Date.now(),
    results: [{modeId: 'pickle', ok: true, latencyMs: 10}],
    recommendedModeId: 'pickle',
  }),
}), {
  stdin: input as unknown as NodeJS.ReadStream,
  stdout: output as unknown as NodeJS.WriteStream,
  stderr: output as unknown as NodeJS.WriteStream,
  debug: true,
  exitOnCtrlC: false,
});

await wait(50);
assert.ok(stripAnsi(rendered).includes('Error404-Labs.Info.VN - Phạm Xuân Hoài'));
assert.ok(stripAnsi(rendered).includes(`PXHVibe v${appVersion}`));
assert.ok(stripAnsi(rendered).includes('CTX 0%'));
await typeText('/status');
input.write('\r');
await wait(80);
assert.ok(stripAnsi(rendered).includes('10 agents · 4 tiers · 8 workflows · 50 skills · 6 contracts'));
assert.equal(provider.calls, 0);
await typeText('/validate');
input.write('\r');
await wait(80);
assert.ok(stripAnsi(rendered).includes('Capability pack hợp lệ'));
assert.equal(provider.calls, 0);
await typeText('/pipeline');
input.write('\r');
await wait(80);
assert.ok(stripAnsi(rendered).includes('Pipeline chưa có TARGET'));
assert.equal(provider.calls, 0);
for (const command of ['/version', '/about', '/detect', '/doctor', '/session', '/history', '/context', '/diff', '/resume', '/retry', '/cancel', '/help']) {
  await typeText(command);
  input.write('\r');
  await wait(55);
}
const commandOutput = stripAnsi(rendered);
assert.ok(commandOutput.includes(`PXHVibe v${appVersion}`));
assert.ok(commandOutput.includes('Error404-Labs.Info.VN'));
assert.ok(commandOutput.includes('Project trống'));
assert.ok(commandOutput.includes('Doctor OK'));
assert.ok(commandOutput.includes('Chưa có runtime session'));
assert.ok(commandOutput.includes('Chưa có phase history'));
assert.ok(commandOutput.includes('Không có checkpoint để resume'));
assert.ok(commandOutput.includes('Chưa có TARGET để retry'));
assert.ok(commandOutput.includes('Lệnh (23)'));
assert.equal(provider.calls, 0);
await typeText('/skills');
input.write('\r');
await wait(80);
assert.ok(stripAnsi(rendered).includes('Skills ('));
assert.equal(provider.calls, 0);
await typeText('/workflows');
input.write('\r');
await wait(80);
assert.ok(stripAnsi(rendered).includes('Workflows ('));
assert.ok(stripAnsi(rendered).includes('Debug'));
assert.equal(provider.calls, 0);
await typeText('/agents');
input.write('\r');
await wait(80);
assert.ok(stripAnsi(rendered).includes('PXH PM (Auto)'));
assert.equal(provider.calls, 0);
input.write('\x1b');
await wait(50);
await typeText('/models');
input.write('\r');
await wait(80);
const visible = stripAnsi(rendered);
assert.ok(visible.includes('Big Pickle (Free)'));
assert.ok(visible.includes('online 0.0s'));
assert.ok(visible.includes('ĐỀ XUẤT'));
assert.equal(provider.calls, 0);
input.write('\x1b');
await wait(50);
await typeText('/modes');
input.write('\r');
await wait(80);
assert.equal(provider.calls, 0);
assert.ok(stripAnsi(rendered).includes('Lệnh không hợp lệ: /modes'));
await typeText('/unknown');
input.write('\r');
await wait(80);
assert.equal(provider.calls, 0);
assert.ok(stripAnsi(rendered).includes('Lệnh không hợp lệ'));
await typeText('sửa lỗi đăng nhập');
input.write('\r');
await waitForCalls(5);
await wait(200);
assert.equal(provider.calls, 5);
const fixPrompt = provider.prompts.find((prompt) => prompt.includes('CURRENT PHASE: FIX')) ?? '';
assert.ok(fixPrompt.startsWith('RULE:\n'));
assert.ok(fixPrompt.includes('- Đọc STATUS.md nếu tồn tại trước khi bắt đầu.'));
assert.ok(fixPrompt.includes('- Cập nhật STATUS.md gồm:'));
assert.ok(fixPrompt.includes('AGENT MODE: BUILD'));
assert.ok(fixPrompt.includes('AGENT ROLE: PXH Bug Hunter'));
assert.ok(fixPrompt.includes('WORKFLOW: Debug'));
assert.ok(fixPrompt.includes('### Systematic Debugging'));
assert.ok(fixPrompt.includes('### Verification'));
assert.ok(fixPrompt.includes('TARGET:\n\nsửa lỗi đăng nhập'));
assert.deepEqual(provider.prompts.slice(0, 5).map((prompt) => /CURRENT PHASE: ([A-Z-]+)/.exec(prompt)?.[1]),
  ['ANALYZE', 'FIX', 'TEST', 'REVIEW', 'PERSIST']);
await typeText('/pipeline');
input.write('\r');
await wait(80);
assert.equal(provider.calls, 5);
assert.ok(stripAnsi(rendered).includes('Pipeline debug'));
const frameHistory = stripAnsi(rendered);
assert.ok(frameHistory.includes('BUILD / PXH PM (Auto)'));
assert.ok(!frameHistory.includes('BUILD / PXH Bug Hunter'));
assert.ok(!frameHistory.includes('YOU  /  TARGET'));
assert.ok(!frameHistory.includes('PXHVIBE  /  OUTPUT'));
await typeText('tiếp tục task');
input.write('\r');
await waitForCalls(10);
await wait(200);
assert.equal(provider.calls, 10);
assert.ok(provider.lastPrompt.includes('BỐI CẢNH HỘI THOẠI TRƯỚC ĐÓ:'));
assert.ok(provider.lastPrompt.includes('[USER]\nsửa lỗi đăng nhập'));
assert.ok(provider.lastPrompt.includes('[ASSISTANT]\nunexpected'));
assert.ok(provider.lastPrompt.includes('TARGET HIỆN TẠI:\ntiếp tục task'));
instance.unmount();
await rm(appRoot, {recursive: true, force: true});
console.log('Slash command tests: passed');

async function typeText(value: string): Promise<void> {
  for (const character of value) {
    input.write(character);
    await wait(3);
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForCalls(expected: number): Promise<void> {
  const deadline = Date.now() + 3_000;
  while (provider.calls < expected && Date.now() < deadline) await wait(25);
}

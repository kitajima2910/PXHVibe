import assert from 'node:assert/strict';
import React from 'react';
import {render} from 'ink';
import {PassThrough} from 'node:stream';
import {App, buildContextualTarget, getErrorMessage, isImageUnsupportedError, isModelLimitError} from '../app.js';
import {getSystemMessageColor} from '../components/MessageList.js';
import type {AIProvider} from '../providers/AIProvider.js';
import type {ProviderRequestOptions, ProviderResponse} from '../types/provider.js';
import {stripAnsi} from '../utils/stripAnsi.js';
import {appVersion} from '../version.js';

class CountingProvider implements AIProvider {
  readonly name = 'Test';
  calls = 0;
  lastPrompt = '';
  lastOptions: ProviderRequestOptions | undefined;
  async sendMessage(prompt: string, options: ProviderRequestOptions): Promise<ProviderResponse> {
    this.calls += 1;
    this.lastPrompt = prompt;
    this.lastOptions = options;
    return {content: 'unexpected'};
  }
  cancel(): void {}
}

const provider = new CountingProvider();
assert.equal(isModelLimitError('HTTP 429 rate_limit_exceeded'), true);
assert.equal(isModelLimitError('Quota exceeded for this model'), true);
assert.equal(isModelLimitError('Network unavailable'), false);
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
  content: '~ 2 lines',
  contextContent: '[PASTED BLOCK 1]\ndòng một\ndòng hai',
  createdAt: new Date(),
}], 'tiếp tục task');
assert.match(bridgedTarget, /dòng một\ndòng hai/);
assert.doesNotMatch(bridgedTarget, /~ 2 lines/);
assert.match(bridgedTarget, /TARGET HIỆN TẠI:\ntiếp tục task$/);
const input = new PassThrough();
Object.assign(input, {isTTY: true, setRawMode: () => input, ref: () => input, unref: () => input});
const output = new PassThrough();
Object.assign(output, {columns: 140, rows: 40, isTTY: true});
let rendered = '';
output.on('data', (chunk) => { rendered += chunk.toString('utf8'); });
const instance = render(React.createElement(App, {
  provider,
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
await wait(80);
assert.equal(provider.calls, 1);
assert.ok(provider.lastPrompt.startsWith('RULE:\n'));
assert.ok(provider.lastPrompt.includes('- Đọc STATUS.md nếu tồn tại trước khi bắt đầu.'));
assert.ok(provider.lastPrompt.includes('- Cập nhật STATUS.md gồm:'));
assert.ok(provider.lastPrompt.includes('AGENT MODE: BUILD'));
assert.ok(provider.lastPrompt.includes('AGENT ROLE: PXH Bug Hunter'));
assert.ok(provider.lastPrompt.endsWith('TARGET:\n\nsửa lỗi đăng nhập'));
const frameHistory = stripAnsi(rendered);
assert.ok(frameHistory.includes('BUILD / PXH PM (Auto)'));
assert.ok(!frameHistory.includes('BUILD / PXH Bug Hunter'));
assert.ok(!frameHistory.includes('YOU  /  TARGET'));
assert.ok(!frameHistory.includes('PXHVIBE  /  OUTPUT'));
await typeText('tiếp tục task');
input.write('\r');
await wait(80);
assert.equal(provider.calls, 2);
assert.ok(provider.lastPrompt.includes('BỐI CẢNH HỘI THOẠI TRƯỚC ĐÓ:'));
assert.ok(provider.lastPrompt.includes('[USER]\nsửa lỗi đăng nhập'));
assert.ok(provider.lastPrompt.includes('[ASSISTANT]\nunexpected'));
assert.ok(provider.lastPrompt.endsWith('TARGET HIỆN TẠI:\ntiếp tục task'));
instance.unmount();
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

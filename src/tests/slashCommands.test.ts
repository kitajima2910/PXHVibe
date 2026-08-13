import assert from 'node:assert/strict';
import React from 'react';
import {render} from 'ink';
import {PassThrough} from 'node:stream';
import {App} from '../app.js';
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
const input = new PassThrough();
Object.assign(input, {isTTY: true, setRawMode: () => input, ref: () => input, unref: () => input});
const output = new PassThrough();
Object.assign(output, {columns: 140, rows: 40, isTTY: true});
let rendered = '';
output.on('data', (chunk) => { rendered += chunk.toString('utf8'); });
const instance = render(React.createElement(App, {provider}), {
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

import assert from 'node:assert/strict';
import React from 'react';
import {render} from 'ink';
import {PassThrough} from 'node:stream';
import {mkdtemp, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {App, formatPhaseSummary} from '../app.js';
import type {AIProvider} from '../providers/AIProvider.js';
import type {ProviderRequestOptions, ProviderResponse} from '../types/provider.js';
import type {AgentEvent} from '../agent/types.js';
import {stripAnsi} from '../utils/stripAnsi.js';

class StreamingProvider implements AIProvider {
  readonly name = 'Stream';
  calls = 0;
  async sendMessage(_prompt: string, options: ProviderRequestOptions): Promise<ProviderResponse> {
    this.calls += 1;
    options.onEvent?.({
      type: 'activity',
      content: 'Đang phân tích yêu cầu...',
    } satisfies AgentEvent);
    options.onEvent?.({
      type: 'tool_start',
      toolName: 'đọc file',
    } satisfies AgentEvent);
    options.onEvent?.({
      type: 'tool_complete',
      toolName: 'đọc file',
      summary: '12 dòng',
    } satisfies AgentEvent);
    options.onEvent?.({
      type: 'text_delta',
      content: 'Đã sửa lỗi đăng nhập.',
    } satisfies AgentEvent);
    options.onEvent?.({
      type: 'text_delta',
      content: ' File đã sửa: src/login.ts.',
    } satisfies AgentEvent);
    return {content: 'Đã sửa lỗi đăng nhập. File đã sửa: src/login.ts.'};
  }
  cancel(): void {}
}

assert.equal(
  formatPhaseSummary([
    {phase: 'analyze', agent: 'PXH PM (Auto)', output: 'Tìm thấy nguyên nhân.'},
    {phase: 'fix', agent: 'PXH Bug Hunter', output: 'Đã patch src/login.ts.'},
    {phase: 'persist', agent: 'PXH Historian', output: ''},
  ]),
  '---\n**Tổng kết pipeline**\n\n**[ANALYZE · PXH PM (Auto)]**\nTìm thấy nguyên nhân.\n\n**[FIX · PXH Bug Hunter]**\nĐã patch src/login.ts.',
);

assert.equal(formatPhaseSummary([
  {phase: 'analyze', agent: 'PXH PM (Auto)', output: '  '},
]), '');

const provider = new StreamingProvider();
const appRoot = await mkdtemp(join(tmpdir(), 'pxhvibe-stream-'));
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

await wait(60);
const typeText = async (value: string): Promise<void> => {
  for (const character of value) {
    input.write(character);
    await wait(3);
  }
};

await typeText('sửa lỗi đăng nhập');
input.write('\r');
const deadline = Date.now() + 5_000;
while (provider.calls < 5 && Date.now() < deadline) await wait(25);
await wait(300);

const frame = stripAnsi(rendered);
// Text streamed live qua text_delta xuất hiện trong assistant message.
assert.ok(frame.includes('Đã sửa lỗi đăng nhập.'));
assert.ok(frame.includes('File đã sửa: src/login.ts.'));
// Tool call hiển thị thành block thu gọn trong transcript, không giấu.
assert.ok(frame.includes('[đọc file]'));
assert.ok(frame.includes('12 dòng'));
// Không còn system message tràn ngập history (activity chỉ ở status line).
assert.ok(!frame.includes('Đang chạy đọc file...'));
assert.ok(!frame.includes('✓ ANALYZE'));
assert.ok(!frame.includes('Hoàn tất FIX'));
// Output từng phase hiện ngay khi phase_pass (không đợi pipeline xong).
assert.ok(frame.includes('FIX · PXH Bug Hunter'));
assert.ok(frame.includes('PERSIST · PXH Historian'));
// Thư mục temp test không phải git repo nên git diff bị bỏ qua, không crash.
assert.ok(!frame.includes('GIT DIFF'));
assert.equal(provider.calls, 5);

instance.unmount();
await rm(appRoot, {recursive: true, force: true});
console.log('Output streaming tests: passed');

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

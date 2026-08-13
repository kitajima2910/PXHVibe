import assert from 'node:assert/strict';
import React from 'react';
import {render} from 'ink';
import {PassThrough} from 'node:stream';
import {CustomApiSetup} from '../components/CustomApiSetup.js';
import type {CustomApiConfig} from '../providers/CustomAgentProvider.js';
import {stripAnsi} from '../utils/stripAnsi.js';

const input = new PassThrough();
Object.assign(input, {
  isTTY: true,
  setRawMode: () => input,
  ref: () => input,
  unref: () => input,
});
const output = new PassThrough();
Object.assign(output, {columns: 100, rows: 20, isTTY: true});
let rendered = '';
let completed: CustomApiConfig | undefined;
output.on('data', (chunk) => { rendered += chunk.toString('utf8'); });

const instance = render(React.createElement(CustomApiSetup, {
  onComplete: (config: CustomApiConfig) => { completed = config; },
  onCancel: () => undefined,
}), {
  stdin: input as unknown as NodeJS.ReadStream,
  stdout: output as unknown as NodeJS.WriteStream,
  stderr: output as unknown as NodeJS.WriteStream,
  debug: true,
  exitOnCtrlC: false,
});

await wait(50);
await typeText('https://example.com/v1');
input.write('\r');
await wait();
await typeText('custom-model');
input.write('\r');
await wait();
await typeText('secret-key');
await wait(50);

const visible = stripAnsi(rendered);
assert.ok(visible.includes('••••••••••'));
assert.ok(!visible.includes('secret-key'));
input.write('\r');
await wait(50);
assert.deepEqual(completed, {
  baseURL: 'https://example.com/v1',
  model: 'custom-model',
  apiKey: 'secret-key',
});
instance.unmount();
console.log('Custom API setup tests: passed');

async function typeText(value: string): Promise<void> {
  for (const character of value) {
    input.write(character);
    await wait(3);
  }
}

function wait(milliseconds = 30): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

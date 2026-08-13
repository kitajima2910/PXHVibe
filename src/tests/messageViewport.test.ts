import assert from 'node:assert/strict';
import React from 'react';
import {Box, render} from 'ink';
import {PassThrough} from 'node:stream';
import {MessageList} from '../components/MessageList.js';
import {buildScrollbar} from '../components/MessageList.js';
import type {Message} from '../types/message.js';
import {stripAnsi} from '../utils/stripAnsi.js';
import {parseTerminalMouse} from '../utils/mouse.js';

assert.deepEqual(parseTerminalMouse('[<64;10;5M'), {
  button: 'wheel-up', action: 'press', x: 9, y: 4,
});
assert.deepEqual(buildScrollbar(5, 10, 0), ['│', '│', '│', '│', '█']);
assert.deepEqual(buildScrollbar(5, 10, 9), ['█', '│', '│', '│', '│']);

const messages: Message[] = Array.from({length: 10}, (_, index) => ({
  id: String(index),
  role: index % 2 === 0 ? 'user' : 'assistant',
  content: `message-${index}`,
  createdAt: new Date(2026, 0, 1, 12, index),
}));
const input = new PassThrough();
Object.assign(input, {isTTY: true, setRawMode: () => input, ref: () => input, unref: () => input});
const output = new PassThrough();
Object.assign(output, {columns: 80, rows: 12, isTTY: true});
let frame = '';
output.on('data', (chunk) => { frame += chunk.toString('utf8'); });

const instance = render(
  React.createElement(Box, {height: 8}, React.createElement(MessageList, {messages})),
  {
    stdin: input as unknown as NodeJS.ReadStream,
    stdout: output as unknown as NodeJS.WriteStream,
    stderr: output as unknown as NodeJS.WriteStream,
    debug: true,
    exitOnCtrlC: false,
  },
);
await new Promise((resolve) => setTimeout(resolve, 40));
const visible = stripAnsi(frame);
assert.match(visible, /message-9/);
assert.doesNotMatch(visible, /message-0/);

input.write('\x1b[5~');
await new Promise((resolve) => setTimeout(resolve, 40));
assert.match(stripAnsi(frame), /HISTORY/);
instance.unmount();

console.log('Message viewport tests passed.');
